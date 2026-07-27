sap.ui.define([
	"sap/m/MessageBox",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (MessageBox, Filter, FilterOperator) {
	"use strict";

	return {
		readEmployeeDetails: function (oModel, sUserId, fnSuccess, fnError) {
			oModel.read("/EmpDetailsSet", {
				filters: [
					new Filter(
						"UserId",
						FilterOperator.EQ,
						sUserId
					)
				],
				success: fnSuccess,
				error: fnError
			});
		},
		loadEmployeeData: function (oModel, oUserId, sKeyValue, fnSuccess, fnError) {
			oModel.read("/EmpIdDropDown", {
				filters: [
					new Filter(
						"UserId",
						FilterOperator.EQ,
						oUserId
					),
					new Filter(
						"RequestID",
						FilterOperator.EQ,
						sKeyValue
					),
					new Filter(
						"SearchText",
						FilterOperator.Contains,
						""
					)
				],
				success: function (oData) {
					var aResults = oData.results.map(function (oItem) {
						oItem.EmplId = oItem.EmplId ?
							oItem.EmplId.replace(/^0+/, "") :
							oItem.EmplId;
						return oItem;
					});
					fnSuccess(aResults);
				},
				error: fnError
			});
		}
	}

});