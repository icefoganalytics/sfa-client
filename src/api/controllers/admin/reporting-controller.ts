import BaseController from "@/controllers/base-controller";
import db from "@/db/db-client";
import ReportingService, {
  FundingStatusReportParams,
  STA_YUKON_UNIVERSITY_TEMPLATE,
  ScholarshipReportParams,
} from "@/services/admin/reporting-service";
import { renderReportAsHtml, renderReportAsPdf } from "@/utils/express-handlebars-pdf-client";
import { isNumber } from "lodash";
import moment from "moment";
import { unparse } from "papaparse";

export default class ReportingController extends BaseController {
  async runFundingStatusReport() {
    let years = this.request.params.years || moment().format("YYYY");
    let yList = years.split(",").map(Number);

    let reportData = await ReportingService.runFundingStatusReport({
      years: yList,
    } as FundingStatusReportParams);

    return ReportingService.generateAs({ format: this.format, reportData })
      .then(async ({ fileContent, fileName, mimeType }) => {
        if (this.format == "html") {
          this.response.send(fileContent);
        } else if (this.format == "json") {
          this.response.json(fileContent);
        } else {
          this.response.setHeader("Content-disposition", `attachment; filename="${fileName}"`);
          this.response.setHeader("Content-type", mimeType);
          this.response.send(fileContent);
        }
      })
      .catch((e) => {
        this.response.send("Error generating report: " + e);
      });
  }

  async runSTAYukonUniversityReport() {
    let academic_year_id = parseInt(this.request.params.academic_year_id ?? moment().format("YYYY"));

    return ReportingService.runSTAYukonUniversityReport({ academic_year_id, format: this.format }).then(
      async (reportData) => {
        if (this.format == "html") {
          let total = reportData.reduce((t: number, a: any) => {
            return t + a.net;
          }, 0);

          let data = { currentDate: new Date(), disbursements: reportData, total };
          let file = await renderReportAsHtml(STA_YUKON_UNIVERSITY_TEMPLATE, data);
          this.response.send(file);
        } else if (this.format == "json") {
          for (let line of reportData) {
            line.weeklyAmount = formatMoney(line.weeklyAmount);
            line.travelAllowance = formatMoney(line.travelAllowance);
            line.net = formatMoney(line.net);
          }

          this.response.json(reportData);
        } else {
          for (let line of reportData) {
            await db("disbursement").where({ id: line.id }).update({ due_date: new Date() });
            line.weeklyAmount = Math.round(line.weeklyAmount * 100);
            line.travelAllowance = Math.round(line.travelAllowance * 100);
            line.net = Math.round(line.net * 100);
          }

          let total = reportData.reduce((t: number, a: any) => {
            return t + a.net;
          }, 0);

          let data = { currentDate: new Date(), disbursements: reportData, total };
          let pdf = await renderReportAsPdf(STA_YUKON_UNIVERSITY_TEMPLATE, data, "LETTER", true);

          this.response.setHeader(
            "Content-disposition",
            `attachment; filename="STA_YukonUniversity_${moment().format("YYYY-MM-DD")}.pdf"`
          );
          this.response.setHeader("Content-type", "application/pdf");
          this.response.send(pdf);
        }
      }
    );
  }

  async runScholarshipReport() {
    let academic_year_id = parseInt(this.request.params.academic_year_id ?? moment().format("YYYY"));

    let reportData = await ReportingService.runScholarshipReport({
      academic_year_id,
      status_id: 6, // qualified
      scholarshipIds: [7, 9, 10, 11],
    } as ScholarshipReportParams);

    return ReportingService.generateAs({ format: this.format, reportData })
      .then(async ({ fileContent, fileName, mimeType }) => {
        if (this.format == "html") {
          this.response.send(fileContent);
        } else if (this.format == "json") {
          this.response.json(fileContent);
        } else {
          this.response.setHeader(
            "Content-disposition",
            `attachment; filename="scholarship_report_${academic_year_id}.csv"`
          );
          this.response.setHeader("Content-type", mimeType);
          this.response.send(fileContent);
        }
      })
      .catch((e) => {
        this.response.send("Error generating report: " + e);
      });
  }

  async runNars2022FTReport() {
    return ReportingService.runNars2022FTReport({ format: this.format }).then((reportData) => {
      if (this.format == "html") {
        this.response.send(reportData);
      } else if (this.format == "csv") {
        this.response.setHeader("Content-disposition", `attachment; filename="PPYT.CSLS.NARS_2223.001.csv"`);
        this.response.setHeader("Content-type", "text/csv");
        this.response.send(reportData);
      } else if (this.format == "json") {
        this.response.json(reportData);
      } else {
        this.response.setHeader("Content-disposition", `attachment; filename="PPYT.CSLS.NARS_2223.001.txt"`);
        this.response.setHeader("Content-type", "text/plain");
        this.response.send(reportData);
      }
    });
  }

  async runNars2022PTReport() {
    return ReportingService.runNars2022PTReport({ format: this.format }).then((reportData) => {
      if (this.format == "html") {
        this.response.send(reportData);
      } else if (this.format == "csv") {
        this.response.setHeader("Content-disposition", `attachment; filename="PPYT.CSLS.PT_NARS_2223.001.csv"`);
        this.response.setHeader("Content-type", "text/csv");
        this.response.send(reportData);
      } else if (this.format == "json") {
        this.response.json(reportData);
      } else {
        this.response.setHeader("Content-disposition", `attachment; filename="PPYT.CSLS.PT_NARS_2223.001.txt"`);
        this.response.setHeader("Content-type", "text/plain");
        this.response.send(reportData);
      }
    });
  }

  async runNars2022DisabilityReport() {
    let academic_year_id = parseInt(this.request.params.academic_year_id ?? moment().format("YYYY"));
    return ReportingService.runNars2022DisabilityReport({ format: this.format, academic_year_id }).then(
      (reportData) => {
        if (this.format == "html") {
          this.response.send(reportData);
        } else if (this.format == "csv") {
          this.response.setHeader(
            "Content-disposition",
            `attachment; filename="PPYT.CSLS.PDEXPAND_2223.${moment().format("YYYY-MM-DD")}.csv"`
          );
          this.response.setHeader("Content-type", "text/csv");
          this.response.send(reportData);
        } else if (this.format == "json") {
          this.response.json(reportData);
        } else {
          this.response.setHeader(
            "Content-disposition",
            `attachment; filename="PPYT.CSLS.PDEXPAND_2223.${moment().format("YYYY-MM-DD")}.txt"`
          );
          this.response.setHeader("Content-type", "text/plain");
          this.response.send(reportData);
        }
      }
    );
  }

  async runNars2022DisabilityRCLReport() {
    let academic_year_id = parseInt(this.request.params.academic_year_id ?? moment().format("YYYY"));
    return ReportingService.runNars2022DisabilityRCLReport({ format: this.format, academic_year_id }).then(
      (reportData) => {
        if (this.format == "html") {
          this.response.send(reportData);
        } else if (this.format == "csv") {
          this.response.setHeader(
            "Content-disposition",
            `attachment; filename="PPYT.CSLS.PDReducedCourseLoad_2223.${moment().format("YYYY-MM-DD")}.csv"`
          );
          this.response.setHeader("Content-type", "text/csv");
          this.response.send(reportData);
        } else if (this.format == "json") {
          this.response.json(reportData);
        } else {
          this.response.setHeader(
            "Content-disposition",
            `attachment; filename="PPYT.CSLS.PDReducedCourseLoad_2223.${moment().format("YYYY-MM-DD")}.txt"`
          );
          this.response.setHeader("Content-type", "text/plain");
          this.response.send(reportData);
        }
      }
    );
  }

  async runNars2023FTReport() {
    return ReportingService.runNars2023FTReport({ format: this.format }).then((reportData) => {
      if (this.format == "html") {
        this.response.send(reportData);
      } else if (this.format == "csv") {
        this.response.setHeader("Content-disposition", `attachment; filename="PPYT.CSLS.NARS_2324.001.csv"`);
        this.response.setHeader("Content-type", "text/csv");
        this.response.send(reportData);
      } else if (this.format == "json") {
        this.response.json(reportData);
      } else {
        this.response.setHeader("Content-disposition", `attachment; filename="PPYT.CSLS.NARS_2324.001.txt"`);
        this.response.setHeader("Content-type", "text/plain");
        this.response.send(reportData);
      }
    });
  }

  async runNars2023PTReport() {
    return ReportingService.runNars2023PTReport({ format: this.format }).then((reportData) => {
      if (this.format == "html") {
        this.response.send(reportData);
      } else if (this.format == "csv") {
        this.response.setHeader("Content-disposition", `attachment; filename="PPYT.CSLS.PT_NARS_2324.001.csv"`);
        this.response.setHeader("Content-type", "text/csv");
        this.response.send(reportData);
      } else if (this.format == "json") {
        this.response.json(reportData);
      } else {
        this.response.setHeader("Content-disposition", `attachment; filename="PPYT.CSLS.PT_NARS_2324.001.txt"`);
        this.response.setHeader("Content-type", "text/plain");
        this.response.send(reportData);
      }
    });
  }

  async runNars2023DisabilityReport() {
    let academic_year_id = parseInt(this.request.params.academic_year_id ?? moment().format("YYYY"));
    return ReportingService.runNars2023DisabilityReport({ format: this.format, academic_year_id }).then(
      (reportData) => {
        if (this.format == "html") {
          this.response.send(reportData);
        } else if (this.format == "csv") {
          this.response.setHeader(
            "Content-disposition",
            `attachment; filename="PPYT.CSLS.PDEXPAND_2324.${moment().format("YYYY-MM-DD")}.csv"`
          );
          this.response.setHeader("Content-type", "text/csv");
          this.response.send(reportData);
        } else if (this.format == "json") {
          this.response.json(reportData);
        } else {
          this.response.setHeader(
            "Content-disposition",
            `attachment; filename="PPYT.CSLS.PDEXPAND_2324.${moment().format("YYYY-MM-DD")}.txt"`
          );
          this.response.setHeader("Content-type", "text/plain");
          this.response.send(reportData);
        }
      }
    );
  }

  async runNars2023DisabilityRCLReport() {
    let academic_year_id = parseInt(this.request.params.academic_year_id ?? moment().format("YYYY"));
    return ReportingService.runNars2023DisabilityRCLReport({ format: this.format, academic_year_id }).then(
      (reportData) => {
        if (this.format == "html") {
          this.response.send(reportData);
        } else if (this.format == "csv") {
          this.response.setHeader(
            "Content-disposition",
            `attachment; filename="PPYT.CSLS.PDReducedCourseLoad_2324.${moment().format("YYYY-MM-DD")}.csv"`
          );
          this.response.setHeader("Content-type", "text/csv");
          this.response.send(reportData);
        } else if (this.format == "json") {
          this.response.json(reportData);
        } else {
          this.response.setHeader(
            "Content-disposition",
            `attachment; filename="PPYT.CSLS.PDReducedCourseLoad_2324.${moment().format("YYYY-MM-DD")}.txt"`
          );
          this.response.setHeader("Content-type", "text/plain");
          this.response.send(reportData);
        }
      }
    );
  }

  async runStepReport() {
    let academic_year_id = parseInt(this.request.params.academic_year_id ?? moment().format("YYYY"));

    let reportData = await ReportingService.runStepReport({
      academic_year_id,
    } as {
      academic_year_id: number;
      format: string | undefined;
    });

    return ReportingService.generateAs({ format: this.format, reportData })
      .then(async ({ fileContent, fileName, mimeType }) => {
        if (this.format == "html") {
          this.response.send(fileContent);
        } else if (this.format == "json") {
          this.response.json(fileContent);
        } else {
          this.response.setHeader("Content-disposition", `attachment; filename="step_report_${academic_year_id}.csv"`);
          this.response.setHeader("Content-type", mimeType);
          this.response.send(fileContent);
        }
      })
      .catch((e) => {
        this.response.send("Error generating report: " + e);
      });
  }

  async runApprovedFundingReport() {
    let academic_year_id = parseInt(this.request.params.academic_year_id ?? moment().format("YYYY"));

    return ReportingService.runApprovedFundingReport({ academic_year_id }).then(async (reportData) => {
      if (this.format == "json") {
        this.response.json(reportData);
      } else {
        let csv = unparse(reportData, {
          quotes: true,
        });
        this.response.setHeader(
          "Content-disposition",
          `attachment; filename="ApprovedFunding${academic_year_id}_${moment().format("YYYY-MM-DD")}.csv"`
        );
        this.response.setHeader("Content-type", "text/csv");
        this.response.send(csv);
      }
    });
  }

  async runT4AReport() {
    let tax_year = parseInt(this.request.params.tax_year ?? moment().format("YYYY"));

    return ReportingService.runT4AReport({ tax_year }).then(async (reportData) => {
      if (this.format == "json") {
        this.response.json(reportData);
      } else {
        let csv = unparse(reportData, {
          quotes: true,
        });
        this.response.setHeader("Content-disposition", `attachment; filename="T4A_${tax_year}.csv"`);
        this.response.setHeader("Content-type", "text/csv");
        this.response.send(csv);
      }
    });
  }

  async runVendorUpdateReport() {
    return ReportingService.runVendorUpdateReport({ format: this.format ?? "json" }).then(async (reportData) => {
      if (this.format == "json") {
        this.response.json(reportData);
      } else {
        let csv = unparse(reportData, {
          quotes: true,
        });
        this.response.setHeader("Content-disposition", `attachment; filename="Vendor request multi-vendor.csv"`);
        this.response.setHeader("Content-type", "text/csv");
        this.response.send(csv);
      }
    });
  }
}

function formatMoney(input: number) {
  if (isNumber(input)) {
    return Intl.NumberFormat("en", {
      currency: "USD",
      style: "currency",
    }).format(input);
  }
  return "";
}
