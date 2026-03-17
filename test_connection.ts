import axios from 'axios';

async function testConnection() {
    console.log("Testing Backend Connection...");
    try {
        const response = await axios.get('http://localhost:5000/api/health');
        console.log("Backend Health Check:", response.data);
    } catch (error: any) {
        console.error("Backend Connection Failed:", error.message);
        console.log("Make sure the backend server is running on port 5000.");
    }
}

testConnection();
