// @ts-check
import { module } from "@prisma/composer";
import queryAdvisorServerService from "./server/service.mjs";

export default module("corollary", ({ provision }) => {
  provision(queryAdvisorServerService, { id: "queryadvisorserver" });
});
