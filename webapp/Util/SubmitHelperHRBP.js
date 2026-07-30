sap.ui.define([
	"sap/m/MessageBox"
], function (MessageBox) {
	"use strict";

	return {

		submitRequest: function (oController, oEvent, oFeedback, DateV) {
			var oView = oController.getView();
			var proceed = "";
			var oEntityMap = {
				"C1": "/MyWorkListCnfrmSet",
				"R1": "/RedesignationSet",
				"R2": "/RetirementSet",
				"T1": "/TransferSet"
			};
			var sAction = oView.getModel("stateModel").getProperty("/selectedAction");
			var sEntitySet = oEntityMap[sAction];
			if (sAction === "C1" && !oController._validateDependentFields(oController)) {
				return;
			}
			var oView = oController.getView();
			var oUser = sap.ushell.Container.getUser();
			var oModel = oView.getModel();
			var sText = oEvent ? oEvent.getSource().getText() : "Submit";
			var sOperation;
			var oEmpData = oView.getModel("employeeModel").getData();
			var oFeedback = oView.getModel("feedbackModel").getData();
			sOperation = oEvent ? oEvent.getSource().data("operation") : "SUB";
			var oEffDateEMP = oView.byId("datePickerEMP").getDateValue();
			var oEffDateMGR = oView.byId("datePickerMGR").getDateValue();
			var oEffDateHR = oView.byId("datePickerHR").getDateValue();
			var dateInst = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd"
			});
			// Pick first non-null date
			var selectedDate = oEffDateEMP || oEffDateMGR || oEffDateHR;
			var DateV = selectedDate ? dateInst.format(new Date(selectedDate)) + "T00:00:00" : null;
			if (!sOperation) {
				sOperation = oEvent.getSource().getCustomData()[0].getValue();
			}
			// Validate mandatory fields before Submit only (skip for Save)
			if (sText !== "Save" && !this._validateInputs(oFeedback, DateV, oController, sAction)) {
				return;
			}
			// Confirmation eligibility check applies for both Save and Submit (C1 only)
			if (sAction === "C1" && !this._validateConfirmationEligibility(oFeedback, oController)) {
				return;
			}
			var sNewDesignation = "";
			if (oView.byId("newDesignation")) {
				sNewDesignation = oView.byId("newDesignation").getValue();
			} else {
				sNewDesignation = "";
			}
			var sNewRm1Id = "";
			var sNewRm1Name = "";
			var sNewMatrixManagerId = "";
			var sNewMatrixManagerName = "";

			// New Reporting Manager
			var oNewRM = oController.getView().byId("newRMItems");

			if (oNewRM && oNewRM.getValue()) {
				var aNewRM = oNewRM.getValue().split("-");

				if (aNewRM.length > 1) {
					sNewRm1Name = aNewRM[0].trim();
					sNewRm1Id = aNewRM[1].trim();
				}
			} else {
				sNewRm1Id = "";
				sNewRm1Name = "";
			}

			// New Matrix Manager
			var oMatrixMgr = oController.getView().byId("matrxMngrEmpId");

			if (oMatrixMgr && oMatrixMgr.getValue()) {
				var aMatrixMgr = oMatrixMgr.getValue().split("-");

				if (aMatrixMgr.length > 1) {
					sNewMatrixManagerName = aMatrixMgr[0].trim();
					sNewMatrixManagerId = aMatrixMgr[1].trim();
				}
			} else {
				sNewMatrixManagerId = "";
				sNewMatrixManagerName = "";
			}
			var oEntry = {
				RequestId: "",
				UserId: oUser.getId(),
				EmpId: (oEmpData.Emp || "").split("-")[0].trim(),
				EmpName: (oEmpData.Emp || "").split("-")[1].trim(),
				ActionId: oView.getModel("stateModel").getProperty("/selectedAction"),
				ActionText: "",
				EffectiveDate: DateV,
				SbuId: "",
				SbuText: (oEmpData.SBU).split("-")[0].trim() || "",
				OrgUnit: "",
				OrgUnitText: (oEmpData.SBU).split("-")[1].trim() || "",
				Location: "",
				LocationText: (oEmpData.Location).split("-")[0].trim() || "",
				Building: "",
				BuildingText: (oEmpData.Location).split("-")[1].trim() || "",
				Designation: oEmpData.Designation || "",
				ManagerId: (oEmpData.manager).split("-")[0].trim() || "",
				ManagerName: (oEmpData.manager).split("-")[1].trim() || "",
				ManagerDesig: oEmpData.RM_Designation || "",
				MatrixManagerId: oEmpData.MatrxMngId || "",
				MatrixManagerName: oEmpData.MatrxMngName || "",
				MatrixManagerDesig: oEmpData.MM_Designation || "",
				HrbpId: "",
				Rm2Id: "",
				Rm3Id: "",
				Hod1Id: (oFeedback.Hod1Name).split("-")[0].trim(),
				Hod1Name: (oFeedback.Hod1Name).split("-")[1].trim() || "",
				Hod1Designation: "",
				Hod2Id: (oFeedback.Hod2Name).split("-")[0].trim(),
				ChroId: (oFeedback.ChroName).split("-")[0].trim(),
				QuntityOfOutput: oFeedback.Quantity || "",
				QalityOfOutput: oFeedback.Quality || "",
				SenseOfResponsibility: oFeedback.Responsibility || "",
				TeamworkAndCollaboration: oFeedback.Teamwork || "",
				TimeManagementAndDiscipline: oFeedback.Time || "",
				Rm1Comment: oFeedback.CommentRM1 || "",
				Rm2Comment: oFeedback.CommentRM2 || "",
				Rm3Comment: oFeedback.CommentRM3 || "",
				Hod1Comment: "",
				Hod2Comment: oFeedback.CommentHOD2 || "",
				ChroComment: oFeedback.CommentCHRO || "",
				HrbpComment: oFeedback.CommentHRBP || "",
				Confirmation: oFeedback.ProbationStatus === 0,
				ExtensionOfProbation: oFeedback.ProbationStatus === 1,
				CurrentProcessor: "",
				CurrentProcessorId: "",
				Status: "",
				CurrentWfTaskId: "",
				CreatedDate: DateV,
				CreatedBy: "",
				LastChangedOn: DateV,
				LastChangedBy: "",
				Rm1Approver: oFeedback.Rm1Approver || "",
				Rm2Approver: oFeedback.Rm2Approver || "",
				Rm3Approver: oFeedback.Rm3Approver || "",
				Hod1Approver: "",
				Hod2Approver: "",
				ChroApprover: "",
				HrbpApprover: "",
				Operation: sOperation,
				ApvrType: "",
				HrbpName: "",
				Rm2Name: "",
				Rm3Name: "",
				Hod2Name: "",
				ChroName: "",
				Instanceid: "",
				NewDesignation: sNewDesignation,
				NewRm1Id: sNewRm1Id,
				NewRm1Name: sNewRm1Name,
				NewRm1Designation: "",
				NewMatrixManagerId: sNewMatrixManagerId,
				NewMatrixManagerName: sNewMatrixManagerName,
				NewMatrixManagerDesig: "",
				NewSbuId: "",
				NewSbuText: "",
				NewOrgunitId: "",
				NewOrgUnittext: "",
				NewLocationId: "",
				NewLocationText: "",
				NewBuildingId: "",
				NewBuildingText: "",
				RetirementDate: "",
				Edit: false,
				Submit: false
			};

			if (sAction === "C1") {
				oEntry.RetirementDate = null;
				oEntry.Edit = "";
				oEntry.Submit = "";
			}

			var oMetadata = oModel.getServiceMetadata();
			if (oMetadata) {
				var sEntityName = sEntitySet.replace("/", "");
				var oSchema = oMetadata.dataServices.schema[0];
				var oEntitySet = (oSchema.entityContainer || []).reduce(function (found, ec) {
					return found || (ec.entitySet || []).find(function (es) { return es.name === sEntityName; });
				}, null);
				if (oEntitySet) {
					var sEntityTypeName = oEntitySet.entityType.split(".").pop();
					var oEntityType = (oSchema.entityType || []).find(function (et) { return et.name === sEntityTypeName; });
					if (oEntityType) {
						var aValidProps = oEntityType.property.map(function (p) { return p.name; });
						Object.keys(oEntry).forEach(function (sKey) {
							if (aValidProps.indexOf(sKey) === -1) {
								delete oEntry[sKey];
							}
						});
					}
				}
			}

			var that = oController;
			oView.setBusy(true);
			console.log("OData CREATE →", sEntitySet, JSON.parse(JSON.stringify(oEntry)));
			oModel.create(sEntitySet, oEntry, {
				success: function (oData, response) {
					var oViewModel = that.getView().getModel("employeeModel");
					var sOldReqId = oViewModel.getProperty("/RequestId");
					var sNewReqId = oData.RequestId || (response && JSON.parse(response.body).d.RequestId);

					if (!sOldReqId && sNewReqId) {
						sap.m.MessageBox.success("Request Id " + sNewReqId + " has been generated!");
					} else {
						sap.m.MessageBox.success("Request Id " + sOldReqId + " has been updated!");

					}

					// reload + UI handling
					that.loadTrackClaimsData(oController);
					oView.setBusy(false);
					var oTabBar = that.byId("roleActionTabBar");
					if (oTabBar) {
						oTabBar.setSelectedKey("TRACK");
						that.onRoleTabSelect({
							getParameter: function () {
								return "TRACK";
							}
						});
					}
				},
				error: function (oError) {
					oView.setBusy(false);
					sap.m.MessageBox.error(sText === "Save" ? "Save failed!" : "Submission failed!");
				}
			});
			// }

			// if (!oController._validateDependentFields(oController)) {
			// 	return;
			// }
			// oController.loadTrackClaimsData(oController);
		},
		_validateDependentFields: function (oController) {
			var bValid = true;
			// Org Unit
			var oOrgUnit = oController.byId("newOrgUnit");
			var aOrgUnits = "";
			// var aOrgUnits = this.getView().getModel("newOrgUnitModel") ? this.getView().getModel("newOrgUnitModel").getProperty("/results") || []
			if (oController.getView().getModel("newOrgUnitModel")) {
				aOrgUnits = oController.getView().getModel("newOrgUnitModel").getProperty("/results");
			} else {
				aOrgUnits = [];
			}
			if (aOrgUnits.length > 0 && !oOrgUnit.getSelectedKey()) {
				oOrgUnit.setValueState("Error");
				oOrgUnit.setValueStateText("Please select an Org Unit");
				bValid = false;
			}

			// Building
			var oBuilding = oController.byId("newBuilding");
			var aBuildings = "";
			// var aBuildings = this.getView().getModel("newBuildingModel") ? this.getView().getModel("newBuildingModel").getProperty("/results") || []
			if (oController.getView().getModel("newBuildingModel")) {
				aBuildings = oController.getView().getModel("newBuildingModel").getProperty("/results");
			} else {
				aBuildings = [];
			}

			if (aBuildings.length > 0 && !oBuilding.getSelectedKey()) {
				oBuilding.setValueState("Error");
				oBuilding.setValueStateText("Please select a Building");
				bValid = false;
			}

			return bValid;
		},
		_validateInputs: function (oFeedback, oEffDate, oController, sAction) {
			var aMissingFields = [];

			// Effective Date check
			if (!oEffDate) {
				aMissingFields.push("Effective Date");
			}

			if (sAction === "C1") {
				// Feedback Ratings check
				if (!oFeedback.Quantity) {
					aMissingFields.push("Quantity of Output");
				}
				if (!oFeedback.Quality) {
					aMissingFields.push("Quality of Output");
				}
				if (!oFeedback.Responsibility) {
					aMissingFields.push("Sense of Responsibility");
				}
				if (!oFeedback.Teamwork) {
					aMissingFields.push("Teamwork and Collaboration");
				}
				if (!oFeedback.Time) {
					aMissingFields.push("Time Management and Discipline");
				}

				// Comment check
				if (!oFeedback.CommentRM1) {
					aMissingFields.push("Comment should not be empty");
				}

				// Probation Status check (must be either 0 or 1)
				if (oFeedback.ProbationStatus !== 0 && oFeedback.ProbationStatus !== 1) {
					aMissingFields.push("Probation Status (Confirmation or Extension)");
				}
			}

			// If any field missing, show bullet-style message
			if (aMissingFields.length > 0) {
				const sMessage =
					"Please check the following points before submitting:\n\n\u2022 " +
					aMissingFields.join("\n\u2022 ");

				sap.m.MessageBox.error(sMessage);
				return false;
			}

			return true;
		},
		_validateConfirmationEligibility: function (oFeedback, oController) {
			var oModel = oController.getView().getModel("feedbackModel");
			var ratings = [
				oFeedback.Quantity,
				oFeedback.Quality,
				oFeedback.Responsibility,
				oFeedback.Teamwork,
				oFeedback.Time
			].filter(Boolean);

			var belowExpectations = ratings.includes("BELOW EXPECTATIONS");
			var satisfactoryCount = ratings.filter(function (r) { return r === "SATISFACTORY"; }).length;
			var probationStatus = oFeedback.ProbationStatus;

			if (probationStatus === 1) {
				oModel.setProperty("/confirmationAllowed", true);
				return true;
			}

			if (belowExpectations || satisfactoryCount > 1) {
				oModel.setProperty("/confirmationAllowed", false);
				sap.m.MessageBox.error("You cannot recommend confirmation with this set of ratings");
				return false;
			}

			oModel.setProperty("/confirmationAllowed", true);
			return true;
		},
		loadTrackClaimsData: function (oController) {
			var that = oController;
			var oView = oController.getView();
			var oUser = sap.ushell.Container.getUser();
			var oClaimsModel = oView.getModel("claimsModel");
			if (!oClaimsModel) {
				oClaimsModel = new sap.ui.model.json.JSONModel();
				oView.setModel(oClaimsModel, "claimsModel");
			}
			var oODataModel = new sap.ui.model.odata.v2.ODataModel(
				"/sap/opu/odata/sap/ZHCM_EMP_MY_WORKLIST_SRV/", {
					useBatch: false
				}
			);
			oView.setBusy(true);
			oODataModel.read("/MyWorkTaskListSet", {
				urlParameters: {
					"$format": "json"
				},
				filters: [
					new sap.ui.model.Filter("UserId", sap.ui.model.FilterOperator.EQ, oUser.getId())
				],
				success: function (responseData) {
					oView.setBusy(false);

					if (responseData.results && responseData.results.length > 0) {
						const updatedResult = responseData.results.map(li => ({
							...li,
							CreatedBy: li.CreatedBy ? li.CreatedBy.replace(/^0+/, "") : li.CreatedBy,
							EffectiveDate: li.EffectiveDate.replace(/(\d{4})(\d{2})(\d{2})/, '$3-$2-$1')
						}));
						oClaimsModel.setData(updatedResult);
					} else {
						sap.m.MessageToast.show("No tasks found for the employee.");
						oClaimsModel.setData({
							claims: []
						});
					}
				},
				error: function (oError) {
					oView.setBusy(false);
					console.error("Error fetching task list:", oError);
					sap.m.MessageToast.show("Failed to load task list data.");
					oClaimsModel.setData({
						claims: []
					});
				}
			});
		}
	}

});