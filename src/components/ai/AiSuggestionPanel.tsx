import { TrendingUp, CheckSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const AiSuggestionPanel = () => {
    return (
        <div className="hidden xl:flex flex-col w-[260px] border-l border-white/5 bg-white/5 backdrop-blur-3xl h-full">
            <div className="p-5 border-b border-white/5">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    Insights
                </h2>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 [&::-webkit-scrollbar]{width:8px} [&::-webkit-scrollbar-thumb]{border-radius:999px;background:rgba(0,0,0,0.08)}">
                {/* Insight Card */}
                <Card className="bg-white/50 border-white/20 hover:border-indigo-200 shadow-sm hover:shadow-md transition-all cursor-pointer mb-6">
                    <CardContent className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                            <Badge className="bg-indigo-100 text-indigo-700 border-0 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 hover:bg-indigo-200">Optimization</Badge>
                            <span className="text-[10px] text-muted-foreground font-medium">Just now</span>
                        </div>
                        <h3 className="text-sm font-semibold text-foreground/90 group-hover:text-indigo-600 transition-colors mt-1">Performance Bottleneck</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Render times in `MeetingRoom.tsx` exceeding 16ms due to excessive re-renders.
                        </p>
                        <Button size="sm" variant="ghost" className="w-full text-xs h-8 justify-between hover:bg-indigo-50 text-indigo-600 mt-2 p-0 px-2">
                            View Details <ArrowRight className="w-3 h-3" />
                        </Button>
                    </CardContent>
                </Card>

                {/* Task Card */}
                <Card className="bg-white/50 border-white/20 hover:border-orange-200 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                            <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-600 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">Action Item</Badge>
                        </div>
                        <p className="text-xs text-foreground/80 leading-relaxed font-medium">
                            Update API client to handle 429 rate limits gracefully.
                        </p>
                        <div className="flex gap-3 pt-2">
                            <Button size="sm" className="flex-1 h-8 text-xs bg-white border border-input shadow-sm hover:bg-accent text-foreground">Suggest Fix</Button>
                            <Button size="sm" className="h-8 w-8 p-0 bg-indigo-600 hover:bg-indigo-500 shadow-sm rounded-lg"><CheckSquare className="w-4 h-4 text-white" /></Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
