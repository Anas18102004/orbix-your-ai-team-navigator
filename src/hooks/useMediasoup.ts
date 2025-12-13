import { useState, useEffect, useRef, useCallback } from 'react';
import * as mediasoupClient from 'mediasoup-client';
import { socketClient } from '@/lib/socket';
import { toast } from 'sonner';

interface Producer {
    id: string;
    track: MediaStreamTrack;
    kind: 'audio' | 'video';
}

interface Consumer {
    id: string;
    producerId: string;
    kind: 'audio' | 'video';
    track: MediaStreamTrack;
    participantId?: string;
    stream?: MediaStream;
    appData?: any;
}

interface UseMediasoupProps {
    meetingId: string;
    user: any;
}

export const useMediasoup = ({ meetingId, user }: UseMediasoupProps) => {
    const [device, setDevice] = useState<mediasoupClient.Device | null>(null);
    const [producers, setProducers] = useState<Map<string, Producer>>(new Map()); // kind -> Producer
    const [consumers, setConsumers] = useState<Map<string, Consumer>>(new Map()); // consumerId -> Consumer

    // Refs to avoid stale closures in socket callbacks
    const sendTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
    const recvTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
    const deviceRef = useRef<mediasoupClient.Device | null>(null);
    const producersRef = useRef<Map<string, Producer>>(new Map());
    const consumersRef = useRef<Map<string, Consumer>>(new Map());

    // Helper to update state and ref
    const updateConsumers = useCallback((updater: (prev: Map<string, Consumer>) => Map<string, Consumer>) => {
        setConsumers((prev) => {
            const next = updater(prev);
            consumersRef.current = next;
            return next;
        });
    }, []);

    const updateProducers = useCallback((updater: (prev: Map<string, Producer>) => Map<string, Producer>) => {
        setProducers((prev) => {
            const next = updater(prev);
            producersRef.current = next;
            return next;
        });
    }, []);

    // Initialize
    const initializeClient = useCallback(async (routerRtpCapabilities: any) => {
        try {
            const newDevice = new mediasoupClient.Device();
            await newDevice.load({ routerRtpCapabilities });

            setDevice(newDevice);
            deviceRef.current = newDevice;

            console.log('Mediasoup Device loaded');
            return newDevice;
        } catch (error: any) {
            console.error('Failed to load Mediasoup Device:', error);
            if (error.name === 'UnsupportedError') {
                toast.error('Browser not supported for WebRTC');
            }
            throw error;
        }
    }, []);

    // Create Transport
    const createTransport = useCallback(async (direction: 'send' | 'recv', transportOptions: any) => {
        if (!deviceRef.current) return;

        const transport = direction === 'send'
            ? deviceRef.current.createSendTransport(transportOptions)
            : deviceRef.current.createRecvTransport(transportOptions);

        transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
                // Signal to server
                socketClient.emit('meeting:connect-transport', {
                    meetingId,
                    transportId: transport.id,
                    dtlsParameters,
                    direction
                }, (response: any) => {
                    if (response?.error) errback(new Error(response.error));
                    else callback();
                });
            } catch (error) {
                errback(error as Error);
            }
        });

        if (direction === 'send') {
            transport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
                try {
                    socketClient.emit('meeting:produce', {
                        meetingId,
                        transportId: transport.id,
                        kind,
                        rtpParameters,
                        appData
                    }, ({ id, error }: any) => {
                        if (error) errback(new Error(error));
                        else callback({ id });
                    });
                } catch (error) {
                    errback(error as Error);
                }
            });
        }

        if (direction === 'send') {
            sendTransportRef.current = transport;
        } else {
            recvTransportRef.current = transport;
        }

        return transport;
    }, [meetingId]);

    // Consuming Logic
    const consumeProducer = useCallback(async ({ producerId, participantId, kind }: any) => {
        console.log('[useMediasoup] Consuming producer:', { producerId, participantId, kind });
        if (!recvTransportRef.current || !deviceRef.current) {
            console.warn('[useMediasoup] Cannot consume, missing transport or device');
            return;
        }

        try {
            const { rtpCapabilities } = deviceRef.current;

            socketClient.emit('meeting:consume', {
                meetingId,
                producerId,
                rtpCapabilities,
                transportId: recvTransportRef.current.id
            }, async ({ id, kind: consumerKind, rtpParameters, error }: any) => {
                if (error) {
                    console.error('[useMediasoup] Consume error ack:', error);
                    return;
                }

                // Consumed from server, now creating local consumer...
                const consumer = await recvTransportRef.current!.consume({
                    id,
                    producerId,
                    kind: consumerKind,
                    rtpParameters,
                });

                const stream = new MediaStream();
                stream.addTrack(consumer.track);

                console.log('[useMediasoup] Consumer created locally', { consumerId: consumer.id, kind: consumerKind });

                updateConsumers((prev) => new Map(prev).set(consumer.id, {
                    id: consumer.id,
                    producerId,
                    kind: consumerKind,
                    track: consumer.track,
                    participantId,
                    stream,
                    appData: consumer.appData
                }));

                // Resume (mediasoup client starts paused)
                socketClient.emit('meeting:resume-consumer', { meetingId, consumerId: consumer.id });
            });
        } catch (error) {
            console.error('[useMediasoup] Consume error:', error);
        }
    }, [meetingId, updateConsumers]);

    // Join Implementation
    const joinRoom = useCallback(async (joinData: any) => {
        try {
            if (!joinData.routerRtpCapabilities) {
                console.warn('Managed mode or missing capabilities, Mediasoup not initialized locally.');
                return;
            }

            // 1. Load Device
            await initializeClient(joinData.routerRtpCapabilities);

            // 2. Request Transports
            const { sendTransportOptions, recvTransportOptions } = await new Promise<any>((resolve, reject) => {
                socketClient.emit('meeting:get-transports', { meetingId }, (response: any) => {
                    if (response.error) reject(response.error);
                    else resolve(response);
                });
            });

            if (sendTransportOptions) {
                const tx = await createTransport('send', sendTransportOptions);
                console.log('Send Transport created:', tx?.id);
            }

            if (recvTransportOptions) {
                const rx = await createTransport('recv', recvTransportOptions);
                console.log('Recv Transport created:', rx?.id);
            }

            // Trigger initial consume
            socketClient.emit('meeting:get-producers', { meetingId }, async (producers: any[]) => {
                console.log('[useMediasoup] Found existing producers:', producers?.length);
                if (Array.isArray(producers)) {
                    for (const p of producers) {
                        // appData contains userId as per my backend change?
                        // verify: producer.appData.userId was injected in handleProduce (socket.ts line 563)
                        const participantId = p.appData?.userId;
                        if (participantId) {
                            await consumeProducer({
                                producerId: p.id,
                                participantId,
                                kind: p.kind
                            });
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Join Room error:', error);
            toast.error('Failed to connect to media server');
        }
    }, [meetingId, initializeClient, createTransport, consumeProducer]);



    // Producing
    const produce = useCallback(async (track: MediaStreamTrack, kind: 'audio' | 'video', source: 'cam' | 'mic' | 'screen' = 'cam') => {
        if (!sendTransportRef.current) {
            console.error('No send transport');
            return;
        }

        try {
            const producer = await sendTransportRef.current.produce({
                track,
                codecOptions: {
                    videoGoogleStartBitrate: 1000
                },
                appData: { source }
            });

            updateProducers((prev) => new Map(prev).set(source, {
                id: producer.id,
                track,
                kind
            }));

            producer.on('trackended', () => {
                console.log('Track ended');
                // Auto-cleanup if track stops (e.g. screen share stop button)
                stopProducer(source);
            });

            producer.on('transportclose', () => {
                console.log('Transport closed');
                updateProducers((prev) => {
                    const next = new Map(prev);
                    next.delete(source);
                    return next;
                });
            });

            return producer;
        } catch (error) {
            console.error('Produce error:', error);
            toast.error(`Failed to broadcast ${kind}`);
        }
    }, [meetingId, updateProducers]);

    const stopProducer = useCallback(async (source: string) => { // 'cam' | 'mic' | 'screen'
        const producer = producersRef.current.get(source);
        if (producer) {
            try {
                // Stop the track locally
                producer.track.stop();

                // Remove from local state immediately
                updateProducers((prev) => {
                    const next = new Map(prev);
                    next.delete(source);
                    return next;
                });

                // Notify server to close producer
                socketClient.emit('meeting:close-producer', { meetingId, producerId: producer.id });

            } catch (error) {
                console.error('Error stopping producer:', error);
            }
        }
    }, [meetingId, updateProducers]);

    // Consuming (Socket Events)
    useEffect(() => {
        const handleNewProducer = async (data: any) => {
            await consumeProducer(data);
        };

        const handleConsumerClosed = ({ consumerId }: any) => {
            updateConsumers((prev) => {
                const next = new Map(prev);
                const consumer = next.get(consumerId);
                if (consumer) {
                    // consumer.track.stop(); // Don't stop remote track, just detach
                    next.delete(consumerId);
                }
                return next;
            });
        };

        socketClient.on('meeting:new-producer', handleNewProducer);
        socketClient.on('meeting:consumer-closed', handleConsumerClosed);

        return () => {
            socketClient.off('meeting:new-producer', handleNewProducer);
            socketClient.off('meeting:consumer-closed', handleConsumerClosed);
        };
    }, [meetingId, updateConsumers, consumeProducer]);

    return {
        device,
        producers,
        consumers,
        joinRoom,
        produce,
        stopProducer
    };
};
