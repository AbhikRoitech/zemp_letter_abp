sap.ui.define([], function () {
	"use strict";

	return {

		/**
		 * Toggles visibility of Matrix Manager field
		 * based on checkbox selection.
		 *
		 * @param {sap.ui.core.mvc.View} oView Current view instance
		 * @param {boolean} bVisible Visibility flag
		 */
		toggleMatrixManagerField: function (oView, bVisible) {
			this._clearMatrixManagerField(oView);
			oView.byId("MatrxMngEmpId").setVisible(bVisible);
		},
		_clearMatrixManagerField: function (oView) {
			// Clear Input Value
			var oInputReDesig = oView.byId("matrxMngrEmpId");
			var oInputTransfer = oView.byId("matrxMngrEmpIdTransfer");
			if (oInputReDesig) {
				oInputReDesig.setValue("");
				oInputReDesig.setValueState("None");
			} else if (oInputTransfer) {
				oInputTransfer.setValue("");
				oInputTransfer.setValueState("None");
			}
			// Clear Suggestion Model
			var oModel = oView.getModel("MatrxMngrEmpSetModel");
			if (oModel) {
				oModel.setData({
					results: []
				});
			}
		}

	};
});