import { LinearClient } from '@linear/sdk';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.LINEAR_API_KEY) {
  throw new Error("LINEAR_API_KEY is not set");
}

// Api key authentication
const linearClient = new LinearClient({
  apiKey: process.env.LINEAR_API_KEY
});

export default linearClient; 