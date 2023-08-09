import { Knex } from "knex";
import { BaseRepository } from "../base-repository";

interface ChequeReqDTO {
    request_type_id: number,
    disbursement_id: number,
    disbursed_amount: number,
    bg_id: number,
    issue_date: Date | string,
    f_year: number
};

export class ChequeReqList extends BaseRepository {

    //private applicationRepo: ApplicationRepository;
    //private application: Partial<ApplicationDTO> = {};

    constructor(maindb: Knex<any, unknown>) {
        super(maindb);
        //this.applicationRepo = new ApplicationRepository(maindb);
    }

    //AfterPForm ()
    async validate(
        issueDate: string
    ): Promise<any> {
        let records: any = []
        let start_p = '';
        let serial_no_p = null;

        if (true) { //start_p === '0'
            //EXEC sfa.assign_cheque_req_batch @issue_date_p = @issue_date_p OUTPUT, @serial_no_p = @serial_no_p OUTPUT;      
            serial_no_p = await this.assignChequeReqBatch(issueDate);

        } else {
            //:issue_date_p := TO_DATE(SUBSTR(:start_p,1,11),'DD MON RRRR');
            //:serial_no_p := TO_NUMBER(SUBSTR(:start_p,13));
        }
        //:issue_date_str_p := TO_CHAR (:issue_date_p, 'YYYYMMDD'); -- Added for Windows 7 issue with dateCOUNT(d.disbursement_id)
        const disburseCount = await this.mainDb('sfa.disbursement')
            .count('id as count')
            .where('financial_batch_run_date', issueDate)
            .where('financial_batch_serial_no', serial_no_p)
            .whereNotNull('issue_date'); //NOTE: Amy has confirmed that as long as the batch report will not pick up disbursements until they have an issue date

        if (!disburseCount?.[0].count) {
            return { success: false, text: 'There are no new disbursements for this date. This will end the report.' }
        } else {
            records = await this.getInfoFileDAT(issueDate, serial_no_p || 0) ?? [];   //cheque_req_export;
        }

        const filename = this.generateFileName(issueDate, serial_no_p || 0);

        return { success: true, data: { records: [ ...records ], filename } };
    }

    //assign_cheque_req_batch ()
    async assignChequeReqBatch(
        issueDate: string
    ): Promise<number | undefined> {
        try {
            const fb_serial = await this.getScalarValue<number>("get_serial_fct", [
                `'${issueDate}'`
            ]);

            let disb_list: ChequeReqDTO[] = []; // CURSOR disb_cur
            let num_request_type;
            let num_batch;
            let num_bg;
            let int_count;
            let batch_year;
            let ori_disb_sign;
            let disb_sign;
            let fb_seq_name;
            let id_year;
            let ori_fb_year;

            disb_list = await this.getDisburseList(issueDate) ?? [];

            num_request_type = null;
            num_bg = null;
            int_count = 0;
            
            //for await (const disburse of disb_list) {
            for (let index = 0; index < disb_list.length; index++) {
                const disburse = disb_list[index];

                disb_sign = disburse.disbursed_amount < 0
                    ? 'NEG'
                    : 'POS';

                // If this is the first time through or the request type is new or the batch group had changed or the disbursement sign has changed
                // or the financial batch year has changed or 25 records have been added to a batch then start a new batch
                if (
                    num_request_type === null ||
                    num_request_type !== disburse.request_type_id ||
                    num_bg === null ||
                    num_bg !== disburse.bg_id ||
                    ori_disb_sign === null ||
                    ori_disb_sign !== disb_sign ||
                    ori_fb_year === null ||
                    ori_fb_year !== disburse.f_year ||
                    int_count === 25
                ) {
                    num_request_type = disburse.request_type_id;
                    num_bg = disburse.bg_id;
                    ori_disb_sign = disb_sign;
                    ori_fb_year = disburse.f_year;
                    batch_year = parseInt(disburse.f_year.toString().substring(2, 4), 10);

                    // Select the appropriate sequence name.
                    if (disburse.bg_id === 1) {
                        fb_seq_name = 'FB_' + disburse.f_year + '_STA_SEQ';
                    } else if (disburse.bg_id === 2) {
                        fb_seq_name = 'FB_' + disburse.f_year + '_CSL_SEQ';
                    } else if (disburse.bg_id === 3) {
                        fb_seq_name = 'FB_' + disburse.f_year + '_ORI_SEQ';
                    } else if (disburse.bg_id === 4) {
                        fb_seq_name = 'FB_' + disburse.f_year + '_OTHER_SEQ';
                    }

                    const validateSequence: any = await this.mainDb.raw(`
                    SELECT 1
                    FROM sys.sequences sq
                    INNER JOIN sys.schemas s ON s.schema_id = sq.schema_id
                    WHERE sq.name = '${fb_seq_name}'
                    AND s.name = 'sfa'
                `);

                    const existSequence = validateSequence?.length > 0;

                    if (existSequence) {

                        const getNumBatch: any = await this.mainDb
                            .raw(`SELECT NEXT VALUE FOR sfa.${fb_seq_name} AS num_batch`);

                        num_batch = parseInt(getNumBatch[0].num_batch);

                        int_count = 1;
                    } else {
                        const createSequence: any = await this.mainDb.raw(`
                        CREATE SEQUENCE sfa.${fb_seq_name}
                        START WITH 1
                        INCREMENT BY 1;
                    `);

                        const getNumBatch: any = await this.mainDb
                            .raw(`SELECT NEXT VALUE FOR sfa.${fb_seq_name} AS num_batch`);

                        num_batch = parseInt(getNumBatch[0].num_batch);

                        int_count = 1;
                    }

                    //Get the next batch number from the sequence
                    //EXEC('SELECT @num_batch = NEXT VALUE FOR ' + @fb_seq_name, N'@num_batch INT OUTPUT', @num_batch OUTPUT);
                    //SET @int_count = 1;
                } else if ((num_request_type === disburse.request_type_id) && (int_count !== 25)) {
                    int_count++;
                }

                const updateDisburse = await this.mainDb("sfa.disbursement")
                    .where({ id: disburse.disbursement_id })
                    .update({
                        financial_batch_id: num_batch, 
                        financial_batch_id_year: batch_year,
                        financial_batch_run_date: issueDate, 
                        financial_batch_serial_no: fb_serial
                    });
            }

            return fb_serial;
        } catch (error) {
            console.log(error);
            return undefined;
        }
    }

    async getDisburseList(
        issueDate: string
    ): Promise<ChequeReqDTO[] | undefined> {
        try {
            const disb_list = await this.mainDb('sfa.funding_request as fr')
                .select(
                    'fr.request_type_id',
                    'd.id as disbursement_id',
                    'd.disbursed_amount',
                    this.mainDb.raw(`
          CASE
            WHEN rt.batch_group_id = 5 THEN
              CASE fr.yea_request_type
                WHEN 1 THEN 3
                WHEN 2 THEN 4
                ELSE 1
              END
            ELSE ISNULL(sfa.get_batch_group_id_fct(fr.id), rt.batch_group_id)
          END AS bg_id`),
                    'd.issue_date',
                    this.mainDb.raw('sfa.get_fiscal_year_fct(d.issue_date) AS f_year'),
                )
                .innerJoin('sfa.disbursement as d', 'fr.id', 'd.funding_request_id')
                .innerJoin('sfa.request_type as rt', 'fr.request_type_id', 'rt.id')
                .whereNotNull('rt.batch_group_id')
                .where((builder) => {
                    builder.where('d.disbursed_amount', '<>', 0).orWhere('fr.request_type_id', 4);
                })
                .where('d.issue_date', '<=', issueDate)
                .where('d.issue_date', '>', this.mainDb.raw("CONVERT(DATE, '20050331', 112)"))
                .whereNotNull('d.due_date')
                .whereNull('d.financial_batch_id')
                .orderBy('bg_id')
                .orderBy('fr.request_type_id')
                .orderBy('f_year')
                .orderBy('d.disbursed_amount', 'desc');

            return disb_list;
        } catch (error) {
            console.log(error);
            return undefined;
        }
    }

    async getInfoFileDAT(
        issueDate: string,
        serial_no: number
    ): Promise<any[] | undefined> {
        try {
            const records = await this.mainDb.raw(`
                SELECT * FROM sfa.get_records_for_cheque_req_dat_file('${issueDate}', ${serial_no});
            `); //recordsForDATFile

            return records;
        } catch (error) {
            console.log(error);
            return undefined
        }
    }
    generateFileName(
        issueDateStr: string,
        serialNo: number
    ): string {
        const issueDate = new Date(issueDateStr);

        const formattedDate = issueDate.getFullYear().toString().slice(-2) +
                             ('0' + (issueDate.getMonth() + 1)).slice(-2) +
                             ('0' + issueDate.getDate()).slice(-2);
    
        const formattedSerialNo = ('0' + serialNo).slice(-2);
    
        const fileName = 'SFVO_' + formattedDate + '_' + formattedSerialNo + '.dat';
        
        return fileName;
    }
}