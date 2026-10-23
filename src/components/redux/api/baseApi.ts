import { TOKEN_NAME } from "@/src/utility/authToken";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";


const baseQuery = fetchBaseQuery({
    baseUrl: " http://localhost:5000/api/v1",
    prepareHeaders: (headers) => {
        let token: string | null = null;
        if (typeof window !== "undefined") {
            try {
                token = localStorage.getItem(TOKEN_NAME);
            } catch (error) {
                console.error("Could not read the access token for the API request:", error);
            }
        }

        if (token) {
            headers.set("Authorization", `${token}`);
        }

        return headers;
    },
});

export const baseApi = createApi({
    reducerPath: "baseApi",
    baseQuery,
    tagTypes: [ "auth", "assigment", "submission"],
    endpoints: () => ({}),
});