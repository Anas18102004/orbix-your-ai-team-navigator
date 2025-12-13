# MongoDB Replica Set Setup Guide

## Option 1: MongoDB Atlas (Recommended - Easiest)

MongoDB Atlas provides a free tier with replica sets included. This is the easiest way to get started.

### Steps:

1. **Sign up for MongoDB Atlas**
   - Go to https://www.mongodb.com/cloud/atlas/register
   - Create a free account

2. **Create a Free Cluster**
   - Click "Build a Database"
   - Choose "M0 FREE" (Free Shared tier)
   - Select a cloud provider and region (closest to you)
   - Click "Create"

3. **Set up Database Access**
   - Go to "Database Access" in the left menu
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Create a username and password (save these!)
   - Set privileges to "Atlas admin" or "Read and write to any database"
   - Click "Add User"

4. **Set up Network Access**
   - Go to "Network Access" in the left menu
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (for development) or add your IP
   - Click "Confirm"

5. **Get Connection String**
   - Go to "Database" in the left menu
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`)
   - Replace `<password>` with your actual password
   - Add database name: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/orbix?retryWrites=true&w=majority`

6. **Update .env file**
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/orbix?retryWrites=true&w=majority
   ```

7. **Restart your server**
   ```bash
   npm run dev:server
   ```

You should now see:
```
✅ MongoDB change streams initialized
✅ MongoDB connected
```

---

## Option 2: Local MongoDB Replica Set (Windows)

If you prefer to run MongoDB locally, follow these steps:

### Prerequisites:
- MongoDB Community Edition installed
- MongoDB data directory created

### Steps:

1. **Create MongoDB data directory**
   ```powershell
   mkdir C:\data\db
   mkdir C:\data\rs0-0
   mkdir C:\data\rs0-1
   mkdir C:\data\rs0-2
   ```

2. **Start MongoDB instances** (open 3 separate PowerShell windows):

   **Window 1 - Primary:**
   ```powershell
   mongod --replSet rs0 --port 27017 --dbpath C:\data\rs0-0 --bind_ip localhost
   ```

   **Window 2 - Secondary 1:**
   ```powershell
   mongod --replSet rs0 --port 27018 --dbpath C:\data\rs0-1 --bind_ip localhost
   ```

   **Window 3 - Secondary 2:**
   ```powershell
   mongod --replSet rs0 --port 27019 --dbpath C:\data\rs0-2 --bind_ip localhost
   ```

3. **Initialize the replica set** (in a 4th PowerShell window):
   ```powershell
   mongosh --port 27017
   ```
   
   Then run:
   ```javascript
   rs.initiate({
     _id: "rs0",
     members: [
       { _id: 0, host: "localhost:27017" },
       { _id: 1, host: "localhost:27018" },
       { _id: 2, host: "localhost:27019" }
     ]
   })
   ```

4. **Verify replica set status:**
   ```javascript
   rs.status()
   ```
   
   You should see `"stateStr": "PRIMARY"` for one member.

5. **Update .env file:**
   ```env
   MONGODB_URI=mongodb://localhost:27017,localhost:27018,localhost:27019/orbix?replicaSet=rs0
   ```

6. **Restart your server**

### Single-Node Replica Set (Simpler for Development)

If you just want a single-node replica set for development:

1. **Create data directory:**
   ```powershell
   mkdir C:\data\db
   ```

2. **Start MongoDB:**
   ```powershell
   mongod --replSet rs0 --port 27017 --dbpath C:\data\db
   ```

3. **Initialize replica set** (in another terminal):
   ```powershell
   mongosh
   ```
   
   Then:
   ```javascript
   rs.initiate({
     _id: "rs0",
     members: [
       { _id: 0, host: "localhost:27017" }
     ]
   })
   ```

4. **Update .env:**
   ```env
   MONGODB_URI=mongodb://localhost:27017/orbix?replicaSet=rs0
   ```

---

## Verify Replica Set is Working

After setup, restart your server and you should see:
```
✅ MongoDB change streams initialized
✅ MongoDB connected
🚀 Server running on port 3000
📡 WebSocket server ready
```

**No warning about replica sets!** This means realtime features are enabled.

---

## Troubleshooting

### "replica set not initialized"
- Make sure you ran `rs.initiate()` in mongosh
- Check `rs.status()` to verify the replica set is running

### "Connection refused"
- Make sure MongoDB is running
- Check the port numbers match your .env file

### "Authentication failed" (Atlas)
- Double-check your username and password in the connection string
- Make sure you replaced `<password>` with your actual password
- Verify network access allows your IP address

