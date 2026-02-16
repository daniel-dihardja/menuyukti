export function useWarehouseReadPath(): boolean {
  return process.env.WAREHOUSE_READS_ENABLED === "1";
}
