import { baseApi } from "../api/baseApi";


export const submissionApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        submitAssigment: builder.mutation({
            query: (userInfo) => ({
                url: "/submission/submit_assigment",
                method: "POST",
                body: userInfo,
            }),
            invalidatesTags: ["submission"],
        }),
        specificSubmissionAssigemt: builder.query({
            query: (id) => ({
                url: `/submission/find_by_specifc_submission/${id}`,
                method: "GET"
            }),
            providesTags: ['submission']
        }),
        getMySubmissionAsssigment: builder.query({
            query: (params) => ({
                url: "/submission/find_my_submission",
                method: "GET",
                params
            }),
            providesTags: ["submission"]
        }),
        getAnalysis: builder.query({
            query: () => ({
                url: "/submission/analysis",
                method: "GET"
            }),
            providesTags: ["submission"]
        }),
        getSubmissionAssigment: builder.query({
            query: (params) => ({
                url: "/submission/my_all_review_assigment",
                method: "GET",
                params
            }),
            providesTags: ["submission"]
        }),
        markSubmission: builder.mutation({
            query: ({ id, body }) => ({
                url: `/submission/update_assigment/${id}`, // <- change to your marks/update route
                method: "PATCH",
                body,
            }),
            invalidatesTags: ["submission"],
        }),

        deleteSubmission: builder.mutation({
            query: (id: string) => ({
                url: `/submission/delete_submission_assigment/${id}`, // <- change to your delete route
                method: "DELETE",
            }),
            invalidatesTags: ["submission"],
        }),

    })
});

export const {
    useSubmitAssigmentMutation,
    useSpecificSubmissionAssigemtQuery,
    useGetMySubmissionAsssigmentQuery,
    useGetAnalysisQuery,
    useGetSubmissionAssigmentQuery,
    useDeleteSubmissionMutation,
    useMarkSubmissionMutation
} = submissionApi;