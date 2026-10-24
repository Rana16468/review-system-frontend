import { baseApi } from "../api/baseApi";

export const assigmentApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        createAssigment: builder.mutation({
            query: (body) => ({
                url: "/assigment/create_assigment",
                method: "POST",
                body,
            }),
            invalidatesTags: ["assigment"],
        }),

       
        getAssigments: builder.query({
            query: (params) => ({
                url: "/assigment/my_all_assigment",
                method: "GET",
                params,
            }),
            providesTags: ["assigment"],
        }),

        updateAssigment: builder.mutation({
            query: ({ id, data }) => ({
            
                url: `/assigment/update_assigment/${id}`,
                method: "PATCH",
                body: data,
            }),
            invalidatesTags: ["assigment"],
        }),

        deleteAssigment: builder.mutation({
            query: ({ id }) => ({
                url: `/assigment/delete_assigment/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["assigment"],
        }),
        getSpecificAssigment: builder.query({
            query: (id) => ({
                url: `/assigment/specific_assigment/${id}`,
                method: "GET"
            }),
            providesTags: ["assigment"]
        })
    }),
});

export const {
    useCreateAssigmentMutation,
    useGetAssigmentsQuery,
    useUpdateAssigmentMutation,
    useDeleteAssigmentMutation,
    useGetSpecificAssigmentQuery
} = assigmentApi;