const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sentiment-analyzer';
  
  try {
    console.log('🔄 Testing MongoDB Atlas connection...');
    console.log('🔗 Connection string:', MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@'));
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Successfully connected to MongoDB Atlas!');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
    console.log('🔗 Host:', mongoose.connection.host);
    
    // Test creating a collection
    const testCollection = mongoose.connection.db.collection('connection_test');
    await testCollection.insertOne({ 
      message: 'Connection test successful', 
      timestamp: new Date(),
      test: true
    });
    console.log('✅ Successfully created a test document!');
    
    // Clean up test document
    await testCollection.deleteOne({ test: true });
    console.log('🧹 Cleaned up test document');
    
    console.log('🎯 Database is ready for your sentiment analyzer!');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n🔍 Troubleshooting tips:');
    console.log('1. Check if MONGODB_URI is set in your .env file');
    console.log('2. Verify your MongoDB Atlas credentials');
    console.log('3. Ensure network access is configured (0.0.0.0/0)');
    console.log('4. Check if your cluster is running');
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB Atlas');
    }
  }
}

testConnection(); 