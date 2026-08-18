export type ActionState<T = undefined> = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
  data?: T
}

export const initialActionState = <T = undefined>(): ActionState<T> => ({
  success: false,
  message: "",
})

export const successState = <T>(message: string, data?: T): ActionState<T> => ({
  success: true,
  message,
  data,
})

export const errorState = <T = undefined>(
  message: string,
  errors?: Record<string, string[]>
): ActionState<T> => ({
  success: false,
  message,
  errors,
})

export const zodErrorsToFieldErrors = (
  fieldErrors: Record<string, string[] | undefined>
): Record<string, string[]> => {
  const result: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(fieldErrors)) {
    if (value) result[key] = value
  }
  return result
}
