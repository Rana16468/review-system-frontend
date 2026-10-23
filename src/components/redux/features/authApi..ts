import { baseApi } from "../api/baseApi";

export const authApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        createAccount: builder.mutation({
            query: (userInfo) => ({
                url: "/user/create-user",
                method: "POST",
                body: userInfo,
            }),
            invalidatesTags: ["auth"],
        }),
        myProfile: builder.query({
            query: () => ({
                url: "/user/my-profile",
                method: "GET",
            }),
            providesTags: ["auth"],
        }),
        avater: builder.query({
            query: () => ({
                url: "/user/avater",
                method: "GET",
            }),
            providesTags: ["auth"],

        }),
        getMyProfile: builder.query({
            query:()=>({
                url:"/auth/profile",
                 method: "GET",
            }),
             providesTags: ["auth"],


        })

    }),
});

export const { useCreateAccountMutation, useMyProfileQuery,
     useAvaterQuery, useGetMyProfileQuery } = authApi;