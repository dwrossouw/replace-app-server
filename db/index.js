const mongoose = require("mongoose");

// Establish a reusable MongoDB connection when it is not already open.
async function connectDB(){
    // readyState 1 means Mongoose is already connected. Reusing that connection avoids creating another connection for every request.
    if (mongoose.connection.readyState ===1){
        return;
    }

    try {
        // Read the database URI from the environment and ask Mongoose to connect.
        const response = await mongoose.connect(process.env.MONGODB_URI);

        // The active connection's name identifies the MongoDB database in use.
        const dbName = response.connections[0].name;
        console.log(`Connnected to Mongo database: ${dbName}`);
    } catch (error) {
        // Log connection failures while keeping the application process running so the error and available application logs can be inspected.
        console.error("Error connecting to mongo: ", error);
    }
}

module.exports = connectDB;