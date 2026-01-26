export interface QueryParams {
    sort?: { field: string; sort: 'asc' | 'desc' }[];
    pagination?: { page: string; pageSize: string };
    filter?: string[];
    date?: string;
    qr?: string;
}