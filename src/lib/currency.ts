export const formatLkr = (cents: number): string => {
  const amount = cents / 100
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const parseLkrToCents = (value: string | number): number => {
  const num = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value
  if (Number.isNaN(num)) return 0
  return Math.round(num * 100)
}

export const centsToDisplay = (cents: number): string => {
  return (cents / 100).toLocaleString("en-LK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}
