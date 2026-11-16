import axios from "axios";

export const API_BASE_PATH = "/backend";

export const api = axios.create({
  baseURL: API_BASE_PATH,
  timeout: 10_000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});
