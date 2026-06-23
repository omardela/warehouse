import en from "../en/index";
import common from "./common";
import sidebar from "./sidebar";
import auth from "./auth";
import settings from "./settings";
import customers from "./customers";
import suppliers from "./suppliers";
import products from "./products";
import sales from "./sales";
import purchases from "./purchases";
import inventory from "./inventory";
import reports from "./reports";
import employees from "./employees";
import audit from "./audit";
import notifications from "./notifications";
import pos from "./pos";
import documents from "./documents";

const ar: typeof en = {
  common,
  sidebar,
  auth,
  settings,
  customers,
  suppliers,
  products,
  sales,
  purchases,
  inventory,
  reports,
  employees,
  audit,
  notifications,
  pos,
  documents,
};

export default ar;
