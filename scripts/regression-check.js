const fs = require("fs");
const path = require("path");

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const index = read("index.html");
const app = read("app.js");
const backend = read("backend.js");

const requiredScripts = [
  "backend.js",
  "scope-builder.js",
  "project-intelligence.js",
  "project-documents.js",
  "crm-ui.js",
  "app.js",
];

for (const file of requiredScripts) {
  if (!index.includes(file)) throw new Error(`index.html is missing required script: ${file}`);
}

const requiredAppFunctions = [
  "function viewProject(id)",
  "async function toggleSave",
  "async function openProjectIntelligence",
  "async function openScopeBuilder",
  "async function showProjectOnMap",
  "async function addProjectToPipeline",
];

for (const signature of requiredAppFunctions) {
  if (!app.includes(signature)) throw new Error(`app.js is missing required function: ${signature}`);
}

const requiredGlobalHandlers = [
  "window.viewProject=viewProject",
  "window.toggleSave=toggleSave",
  "window.openProjectIntelligence=openProjectIntelligence",
  "window.openScopeBuilder=openScopeBuilder",
  "window.showProjectOnMap=showProjectOnMap",
];

for (const handler of requiredGlobalHandlers) {
  if (!app.includes(handler)) throw new Error(`app.js is missing global inline handler: ${handler}`);
}

const requiredProjectActions = [
  "Project intelligence",
  "Build scope",
  "Plans & Specs",
  "Sales CRM",
  "Show on map",
];

for (const action of requiredProjectActions) {
  if (!app.includes(action)) throw new Error(`project detail UI is missing action: ${action}`);
}

const requiredBackendMethods = [
  "async function saveProject",
  "async function unsaveProject",
  "async function getSavedProjects",
  "async function updatePipeline",
  "async function getProjectIntelligence",
  "async function getProjectDocuments",
];

for (const signature of requiredBackendMethods) {
  if (!backend.includes(signature)) throw new Error(`backend.js is missing required method: ${signature}`);
}

console.log("BuildScout regression contract passed.");
