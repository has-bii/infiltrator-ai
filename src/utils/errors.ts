import { ZodError } from "zod"

export class GlobalError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = message
    this.status = status
  }
}

export class Unauthorized extends GlobalError {
  constructor() {
    super("Unauthorized", 401)
  }
}

export class NotFound extends GlobalError {
  constructor(message: string = "Resource not found") {
    super(message, 404)
  }
}

export const handleApiErrors = (error: unknown, path?: string) => {
  console.error({
    error,
    path,
  })

  if (error instanceof GlobalError) {
    return Response.json(
      {
        message: error.message,
        data: null,
      },
      {
        status: error.status,
      },
    )
  }

  if (error instanceof ZodError) {
    return Response.json(
      {
        message: "Validation error",
        data: null,
      },
      {
        status: 400,
      },
    )
  }

  return Response.json(
    {
      message: "Internal Server Error",
      data: null,
    },
    {
      status: 500,
    },
  )
}
