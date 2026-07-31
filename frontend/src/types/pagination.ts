export type PaginatedResponse<Item> = {
  items: Item[];
  total: number;
  skip: number;
  limit: number;
};

export type PaginationParams = {
  skip: number;
  limit: number;
};
