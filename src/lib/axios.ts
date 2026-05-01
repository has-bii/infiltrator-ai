import axios, { isAxiosError } from "axios"

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (isAxiosError(error) && error.response?.data?.message) {
      error.message = error.response.data.message
    }
    return Promise.reject(error)
  },
)

export default api
