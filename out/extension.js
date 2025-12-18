"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const ExtensionActivator_1 = require("./ui/ExtensionActivator");
let extensionActivator;
function activate(context) {
    extensionActivator = new ExtensionActivator_1.ExtensionActivator();
    extensionActivator.activate(context);
}
exports.activate = activate;
function deactivate() {
    if (extensionActivator) {
        extensionActivator.deactivate();
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map