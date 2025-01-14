export interface DisbursementDTO {
    id?: number;
    disbursement_type_id?: number;
    assessment_id?: number;
    funding_request_id?: number;
    disbursed_amount?: number;
    due_date?: Date | string | null;
    tax_year?: number;
    issue_date?: Date | string;
    paid_amount?: number;
    change_reason_id?: number;
    financial_batch_id?: number;
    financial_batch_id_year?: number;
    financial_batch_run_date?: Date;
    financial_batch_serial_no?: number;
    transaction_number?: string;
    csl_cert_seq_number?: number;
    ecert_sent_date?: Date;
    ecert_response_date?: Date;
    ecert_status?: string;
    ecert_portal_status_id?: number;
    delete_flag?: boolean;
}

export type DisbursementTable = Omit<DisbursementDTO, "id" | "delete_flag">;

export const disbursementColumns: (keyof DisbursementTable)[] = [
    "disbursement_type_id",
    "assessment_id",
    "funding_request_id",
    "disbursed_amount",
    "due_date",
    "tax_year",
    "issue_date",
    "paid_amount",
    "change_reason_id",
    "financial_batch_id",
    "financial_batch_id_year",
    "financial_batch_run_date",
    "financial_batch_serial_no",
    "transaction_number",
    "csl_cert_seq_number",
    "ecert_sent_date",
    "ecert_response_date",
    "ecert_status",
    "ecert_portal_status_id",
];