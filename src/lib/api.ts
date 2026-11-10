import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10_000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});
