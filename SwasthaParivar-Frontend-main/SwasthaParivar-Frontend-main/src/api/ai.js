import api from "../lib/api";

export const sendToAI = async (message, token, familyData) => {
  return api.post(
    "/ai/chat",
    { message, familyData },
    token ? { headers: { Authorization: `Bearer ${token}` } } : {}
  );
};
