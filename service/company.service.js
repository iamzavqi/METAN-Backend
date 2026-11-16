const CompanySchema = require("../schema/company.schema");

class CompanyService {
  async regisCompany(req, res) {
    if (req.user.role != "admin") {
      throw new Error("Siz admin emassiz");
    }

    const existCompany = await CompanySchema.findOne({
      companyName: req.body.companyName,
    });
    if (existCompany) throw new Error("Kompaniya allaqachon mavjud");

    const newCompany = await CompanySchema.create({
      companyName: req.body.companyName,
      phone: req.body.phone,
    });
    return newCompany;
  }
  async allCompany(req, res) {
    if (req.user.role != "admin") {
      throw new Error("Siz admin emassiz");
    }

    const company = await CompanySchema.find();

    return company;
  }
}

module.exports = new CompanyService();
