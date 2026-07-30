sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/export/Spreadsheet",
	"sap/ui/export/library",
	"empletter/zemployeeletter/Util/Common",
	"empletter/zemployeeletter/util/SubmitHelperHRBP",
	"empletter/zemployeeletter/util/EmployeeService"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator, Spreadsheet, exportLibrary, Common, SubmitHelperHRBP,
	EmployeeService) {
	"use strict";

	return BaseController.extend("empletter.zemployeeletter.controller.InitialScreen", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		_ratingData: {
			"Quantity of Output": [
				"Output exceptionally high and on time",
				"Major tasks achieved within time & the output is more than the normally assigned tasks",
				"Major tasks achieved within time",
				"Moderate results achieved",
				"Quantity of output below expectations"
			],
			"Quality of Output": [
				"Excellent quality of output, sets new benchmarks",
				"Quality often exceeds expectations",
				"Does a thorough and accurate job – mostly",
				"Generally produces work of acceptable quality",
				"Quality of output below standard"
			],
			"Sense of Responsibility and Initiative": [
				"Totally committed and reliable and embeds initiatives in the processes",
				"Takes full responsibility of tasks assigned and takes initiatives for improvement",
				"High sense of duty, seeks responsibility",
				"Works as instructed and accepts responsibiltity",
				"Tries to evade responsibility"
			],
			"Teamwork and Collaboration": [
				"Colleagues actively seek cooperation from her/him",
				"Highly cooperative",
				"Good rapport with colleagues",
				"Generally gets along with colleagues",
				"Cannot get along with colleagues"
			],
			"Time Management": [
				"Totally organised in work, always has time at her/his disposal, conducts oneself exceptionally well",
				"Creates processes to streamline work and is always punctual",
				"Manages her/his work well and takes on additional responsibiltiies, is always available",
				"Is comfortable and organised in his work, is generally punctual",
				"Irregular in attendance, unable to manage work and, therefore, is always hardpressed for time"
			]

		},
		onInit: function () {

			// TAB ACTIONS
			var oStateModel = new sap.ui.model.json.JSONModel({
				Actions: [],
				selectedAction: "",
				selectedRole: "",
				empFieldEnabled: false
			});
			this.getView().setModel(oStateModel, "stateModel");
			// --------------------------------------------------------------------------------------------------------

			// Role model (user role only)
			var oRoleModel = new sap.ui.model.json.JSONModel({
				role: "" // EMP / MGR / HR / BOTH
			});
			this.getView().setModel(oRoleModel, "roleModel");
			// ---------------------------------------------------------------------------------------------------------
			this._aTableSearchState = [];
			this.loadTrackClaimsData();
			// Create view model
			var oViewModel = new sap.ui.model.json.JSONModel({
				worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),
				shareOnJamTitle: this.getResourceBundle().getText("worklistTitle"),
				shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
				shareSendEmailMessage: this.getResourceBundle().getText(
					"shareSendEmailWorklistMessage", [location.href]
				),
				tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
				tableBusyDelay: 0
			});
			this.getView().setModel(oViewModel, "viewModel");

			this.showHideModel();

			// ✅ Get login user details from Launchpad
			if (sap.ushell && sap.ushell.Container) {
				var oUser = sap.ushell.Container.getUser();
				this._oUserInfo = sap.ushell.Container.getUser();
				// this._oUserInfo = "P00012021"
				if (oUser) {
					this.getEmployeeDetails(oUser.getId());
					// this.getEmployeeDetails("P00012021");
					// Example: show user in message toast
					sap.m.MessageToast.show("Welcome " + oUser.getFullName());
				}
			}
		},
		onRoleTabSelect: function (oEvent) {
			var sPreviousTab = this.sSelectedTab;
			this.sSelectedTab = oEvent.getParameter("selectedKey");
			var sSelectedTab = oEvent.getParameter("selectedKey");
			var oView = this.getView();

			if (sPreviousTab === "HR" && sSelectedTab !== "HR") {
				this._clearEmployeeSection();
				oView.getModel("stateModel").setProperty("/empFieldEnabled", false);
				oView.getModel("stateModel").setProperty("/selectedAction", "");
				oView.getModel("stateModel").setProperty("/actionEnabled", true);
				var oEmpModel = oView.getModel("employeeModel");
				if (oEmpModel) {
					oEmpModel.setData({});
				}
				var oEmpIdModel = oView.getModel("employeeModelId");
				if (oEmpIdModel) {
					oEmpIdModel.setProperty("/AllEmployees", []);
					oEmpIdModel.setProperty("/EmplId", "");
				}
				if (this._oCurrentFragment) {
					this._oCurrentFragment.destroy();
					this._oCurrentFragment = null;
				}
				var oContainer = oView.byId("fragmentContainerHR");
				if (oContainer) {
					oContainer.removeAllItems();
				}
				var oCombo = oView.byId("empComboBoxHR");
				if (oCombo) {
					oCombo.setSelectedKey("");
					oCombo.setEnabled(true);
				}
			}
			var oUserRole = oView.getModel("roleModel").getProperty("/role") || {};
			var oStateModel = oView.getModel("stateModel");
			this.oStateCopy = structuredClone(oView.getModel("stateModel").getData());
			var oEmployeeModel = oView.getModel("employeeModelId");
			oStateModel.setProperty("/isEditable", true)
			var aAllActions = [{
				key: "C1",
				text: "Confirmation / Probation Extension"
			}, {
				key: "R1",
				text: "Re-Designation"
			}, {
				key: "R2",
				text: "Retirement"
			}, {
				key: "T1",
				text: "Transfer"
			}];

			var aActions = [];
			var aSelectIds = ["empComboBoxEMP", "empComboBoxMGR", "empComboBoxHR"];
			aSelectIds.forEach(function (sId) {
				var oSelect = this.byId(sId);
				if (oSelect) {
					oSelect.setSelectedKey("");
				}
			}.bind(this));
			// if (oUserRole.Manager === "X" && sSelectedTab === "MGR" && oUserRole.Hrbp === "X") {
			if (oUserRole.Manager === "X" && sSelectedTab === "MGR") {
				aActions = aAllActions.filter(a => a.key === "C1");
				oStateModel.setProperty("/selectedRole", "MGR");
				// this.loadEmployeeData(); // will populate /AllEmployees
			} else if (oUserRole.Hrbp === "X" && sSelectedTab === "HR") {
				aActions = aAllActions.filter(a => a.key !== "C1");
				oStateModel.setProperty("/selectedRole", "HR");
			} else {
				// EMP case → clear employees
				aActions = [];
				oStateModel.setProperty("/selectedRole", "EMP");

				if (oEmployeeModel) {
					oEmployeeModel.setProperty("/AllEmployees", []); // 🔥 clear employees
					oStateModel.setProperty("/Actions", [])
				}
			}
			if (sSelectedTab === "TRACK") {
				oStateModel.setProperty("/Actions", aAllActions)
				this.compeleteDisableFooter()
			} else {
				oStateModel.setProperty("/Actions", aActions)
			}

			// Update stateModel actions
			this.getView().getModel("stateModel").setProperty("/Actions", aActions);
			this.showHideModel();
			this._clearFormValues();
			this.onBackPress(); //Added by Arnab.
		},

		_clearFormValues: function () {
			var oModel = this.getView().getModel("employeeModelId");

			if (!oModel) {
				oModel = new sap.ui.model.json.JSONModel({});
			}
			oModel.setProperty("/EmplId", "");
			oModel.setProperty("/AllEmployees", []);
			var oView = this.getView();
			oView.getModel("stateModel").setProperty("/empFieldEnabled", false);
			var oEmpInput = oView.byId("empItems");
			if (oEmpInput) {
				oEmpInput.setValue("");
			}
			["EMP", "MGR", "HR"].forEach(function (role) {

				var oDP = oView.byId("datePicker" + role);
				if (oDP) {
					oDP.setValue("");
					oDP.setDateValue(null);
				}
			});
		},
		onActionChange: function (oEvent) {
			var oView = this.getView();
			var oUser = sap.ushell.Container.getUser().getId();
			var sKey = oEvent.getSource().getSelectedKey(); // C1 / R1 / R2 / T1
			if (sKey) {
				oView.getModel("stateModel").setProperty("/actionEnabled", false);
				oView.getModel("stateModel").setProperty("/selectedAction", sKey);
			}
			// Added by Arnab - 26.06.2026
			if (oView.getModel("roleModel").getProperty("/role/Manager") === "X" && this.sSelectedTab === "MGR") {
				this.loadEmployeeData(oUser, sKey);
				this.showHideModel();
				this._updateFragment();
				// this.sSelectedTab = "";
			}
			if (this.sSelectedTab === "HR" && sKey) {
				oView.getModel("stateModel").setProperty("/empFieldEnabled", true);
				this._loadEmployeeDropdown(oUser, sKey);
			}
		},

		_updateFragment: function () {
			var oView = this.getView();
			var oState = oView.getModel("stateModel").getData();
			var sFragmentName = "";
			//Added by Arnab - 27.05.2026
			var sRequestID = oState.selectedAction;
			var sUserId = sap.ushell.Container.getService("UserInfo").getId();
			switch (oState.selectedAction) {
			case "C1":
				sFragmentName = "empletter.zemployeeletter.Fragments.Confirm";
				break;
			case "R1":
				sFragmentName = "empletter.zemployeeletter.Fragments.ReDesignation";
				break;
			case "R2":
				sFragmentName = "empletter.zemployeeletter.Fragments.Retirement";
				break;
			case "T1":
				sFragmentName = "empletter.zemployeeletter.Fragments.Transfer";
				break;
			default:
				return;
			}
			// Determine container based on selected role
			var containerId = "";
			var selectedRoleEmp = "";
			if (oState.selectedRole) {
				selectedRoleEmp = oState.selectedRole
			} else {
				selectedRoleEmp = this.oStateCopy.selectedRole
			} // Added by Arnab - 08.06.2026
			// switch (oState.selectedRole) {
			switch (selectedRoleEmp) {
			case "EMP":
				containerId = "fragmentContainerEMP";
				break;
			case "MGR":
				containerId = "fragmentContainerMGR";
				break;
			case "HR":
				containerId = "fragmentContainerHR";
				break;
			}

			var oContainer = oView.byId(containerId);

			if (!oContainer) {
				// Container not yet rendered (inactive tab) -> skip update
				return;
			}

			oContainer.removeAllItems();

			return sap.ui.core.Fragment.load({
				id: oView.getId(),
				name: sFragmentName,
				type: "XML",
				controller: this
			}).then(function (oFragment) {
				this._oCurrentFragment = oFragment;
				oContainer.addItem(oFragment);
			}.bind(this));
		},
		getEmployeeDetails: function (sUserId) {
			EmployeeService.readEmployeeDetails(
				this.getOwnerComponent().getModel(),
				sUserId,
				this._onEmployeeReadSuccess.bind(this),
				this._handleReadError.bind(this)
			);
		},
		_onEmployeeReadSuccess: function (oData) {
			var oUserRole = oData.results[0];
			if (!oUserRole) {
				return;
			}
			this._oUserRole = jQuery.extend(true, {}, oUserRole);
			var oRoleVisibility = {
				showEMP: true,
				showMGR: false,
				showHR: false,
				showTRACK: true
			};
			if (oUserRole.Manager === "X") {
				oRoleVisibility.showMGR = true;
			}
			if (oUserRole.Hrbp === "X") {
				oRoleVisibility.showMGR = true;
				oRoleVisibility.showHR = true;
				this._setActionDropdown();
			}
			var oRoleModel = this.getView().getModel("roleModel");
			oRoleModel.setProperty("/role", oUserRole);
			oRoleModel.setProperty("/roleVisibility", oRoleVisibility);
			this.onRoleTabSelect({
				getParameter: function () {
					return "EMP";
				}
			});
		},
		_handleReadError: function (oError) {
			sap.m.MessageBox.error(
				"Unable to fetch employee details."
			);
		},

		loadEmployeeData: function (oUserId, sKeyValue) {
			var oModel = this.getOwnerComponent().getModel();
			EmployeeService.loadEmployeeData(
				oModel,
				oUserId,
				sKeyValue,
				this._onEmployeeDataSuccess.bind(this),
				this._onEmployeeDataError.bind(this)
			);

		},
		_onEmployeeDataSuccess: function (aEmployees) {
			var oEmployeeModel = this.getView().getModel("employeeModelId");
			if (!oEmployeeModel) {
				oEmployeeModel = new sap.ui.model.json.JSONModel();
				// Increase size limit from default 100 to 500
				oEmployeeModel.setSizeLimit(500);
				this.getView().setModel(oEmployeeModel, "employeeModelId");
			}
			oEmployeeModel.setProperty(
				"/AllEmployees",
				aEmployees
			);
		},
		_onEmployeeDataError: function (oError) {
			sap.m.MessageBox.error(
				"Unable to load employee data."
			);
		},
		onExtensionSelect: function (oEvent) {
			var bSelected = oEvent.getParameter("selected");
			var oModel = this.getView().getModel("feedbackModel");

			if (bSelected) {
				oModel.setProperty("/IsConfirmed", false);
			}
		},
		onEmployeeSelect: function (oEvent) {
			// var sSelectedEmpIdCombobox = typeof oEvent === "string" ? oEvent : oEvent.getSource().getSelectedKey();
			var sSelectedEmpId = "";
			if (typeof oEvent === "string") {
				sSelectedEmpId = oEvent;
			} else {
				var sSelectedKey = oEvent.getSource().getSelectedKey();
				if (sSelectedKey) {
					sSelectedEmpId = sSelectedKey;
				} else {
					var oSelectedItem = oEvent.getParameter("selectedItem");
					if (oSelectedItem) {
						sSelectedEmpId = oSelectedItem.getAdditionalText();
					}
				}
			}

			var oView = this.getView();
			var oEmpModel = oView.getModel("employeeModel");
			if (!oEmpModel) {
				oEmpModel = new sap.ui.model.json.JSONModel();
				oView.setModel(oEmpModel, "employeeModel");
			}
			// USER INFO
			var oUser = sap.ushell.Container.getUser();
			var oActionKey = oView.getModel("stateModel").getProperty("/selectedAction");
			var oRequestId = oView.getModel("employeeModel").getProperty("/RequestId");

			// Create ODataModel without batching
			var oODataModel = new sap.ui.model.odata.v2.ODataModel(
				"/sap/opu/odata/sap/ZHCM_EMP_MY_WORKLIST_SRV/", {
					useBatch: false
				}
			);

			var that = this; // ✅ capture controller reference
			oView.setBusy(true);
			oODataModel.read("/MyWorkListCnfrmSet", {
				urlParameters: {
					"$format": "json"
				},
				filters: [
					new sap.ui.model.Filter(
						"EmpId",
						sap.ui.model.FilterOperator.EQ,
						String(sSelectedEmpId)
					),
					new sap.ui.model.Filter(
						"UserId",
						sap.ui.model.FilterOperator.EQ,
						String(oUser.getId())
					),
					new sap.ui.model.Filter(
						"ActionId",
						sap.ui.model.FilterOperator.EQ,
						String(oActionKey)
					),
					new sap.ui.model.Filter(
						"RequestId",
						sap.ui.model.FilterOperator.EQ,
						String(oRequestId)
					)
				],
				success: function (oData) {
					oView.setBusy(false);

					if (oData.results && oData.results.length > 0) {
						var oSrvData = oData.results[0];

						oEmpModel.setData({
							formVisible: true,
							ActionId: oSrvData.ActionId,
							EmpId: oSrvData.EmpId || "",
							EmpName: oSrvData.EmpName || "",
							EffectiveDate: oSrvData.EffectiveDate,
							// EffectiveDate: that.oSelectedDateCopy,// Commented by Arnab.
							RequestId: oSrvData.RequestId || "",
							Emp: `${oSrvData.EmpId.replace(/^0+/, "")} - ${oSrvData.EmpName}` || "",
							SBU: `${oSrvData.SbuText} - ${oSrvData.OrgUnitText}` || "",
							Location: `${oSrvData.LocationText} - ${oSrvData.BuildingText}` || "",
							Designation: oSrvData.Designation || "",
							manager: `${oSrvData.ManagerId ? oSrvData.ManagerId.replace(/^0+/, "") : ""}-${oSrvData.ManagerName || ""}`,
							RM_Designation: oSrvData.ManagerDesig || "",
							Hod: `${oSrvData.Hod1Id.replace(/^0+/, "")} - ${oSrvData.Hod1Name}` || "",
							Hod1Designation: oSrvData.Hod1Designation || "",
							NewRM: oSrvData.NewRm1Name || "",
							Status: oSrvData.Status || "Open"
						});
						// ENABLE FOOTER
						if (oSrvData.SUBMIT === "X" && oSrvData.Edit !== "X") {
							that.compeleteDisableFooter();
						} else if (oSrvData.Edit === "X") {
							that.editButtonEnable()
						} else {
							that.enableFooter();
						}
						that.setEmployeeAndFeedbackModel(oSrvData);
						//Added by Arnab.
						if (oView.getModel("roleModel").getProperty("/role/Hrbp") !== '' || oView.getModel("roleModel").getProperty("/role/Hrbp") ===
							'X') {
							that._setActionDropdown();
						}
						if (that.oSelectedDateCopy) {
							oView.getModel("employeeModel").setProperty("/EffectiveDate", that.oSelectedDateCopy);
						}

					} else {
						sap.m.MessageToast.show("No data found for selected employee.");
						oEmpModel.setData({});
					}
				},
				error: function (oError) {
					oView.setBusy(false);
					console.error("Error fetching employee details:", oError);
					sap.m.MessageToast.show("Failed to fetch employee details.");
				}
			});
		},
		onRequestPress: function (oEvent) {
			var oView = this.getView();
			var oContext = oEvent.getSource().getBindingContext("claimsModel");
			var sSelectedEmpId = oContext.getProperty("EmpId");
			var sRequestId = oContext.getProperty("RequestId");
			var sActionText = oContext.getProperty("ActionText"); // Backend action text
			var sActionId = oContext.getProperty("ActionId"); // Added by Arnab
			var sUserId = sap.ushell.Container.getService("UserInfo").getId();
			var oEmployeeModelId = oView.getModel("employeeModelId");

			// var aAllActions = [{
			// 	key: "C1",
			// 	text: "Confirmation / Probation Extension"
			// }];
			var aAllActions = [];
			if (sActionText === "Confirmation" || sActionText === "Probation Extension" || sActionText === "Confirmation / Probation Extension")  {
				aAllActions.push({
					key: "C1",
					text: "Confirmation / Probation Extension"
				});
			} else if (sActionText === "Re-designation") {
				aAllActions.push({
					key: "R1",
					text: "Re-Designation"
				});
			} else if (sActionText === "Retirement") {
				aAllActions.push({
					key: "R2",
					text: "Retirement"
				});
			} else if (sActionText === "Transfer") {
				aAllActions.push({
					key: "T1",
					text: "Transfer"
				});
			}

			// Ensure models exist
			var oStateModel = oView.getModel("stateModel");
			if (!oStateModel) {
				oStateModel = new sap.ui.model.json.JSONModel({});
				oView.setModel(oStateModel, "stateModel");
			}

			var oEmployeeModelId = oView.getModel("employeeModelId");
			if (!oEmployeeModelId) {
				oEmployeeModelId = new sap.ui.model.json.JSONModel({});
				oView.setModel(oEmployeeModelId, "employeeModelId");
			}

			// --- Set actions for Select ---
			oStateModel.setProperty("/Actions", aAllActions);
			oView.byId("empComboBoxHR").setSelectedKey(oStateModel.getProperty("/Actions/0/key"));
			// --- Load employees for ComboBox ---
			// this.loadEmployeeData(sUserId, "C1");

			var oEmpModel = oView.getModel("employeeModel");
			if (!oEmpModel) {
				oEmpModel = new sap.ui.model.json.JSONModel();
				oView.setModel(oEmpModel, "employeeModel");
			}

			var oODataModel = new sap.ui.model.odata.v2.ODataModel(
				"/sap/opu/odata/sap/ZHCM_EMP_MY_WORKLIST_SRV/", {
					useBatch: false
				}
			);

			var that = this;
			oView.setBusy(true);

			oODataModel.read("/MyWorkListCnfrmSet", {
				urlParameters: {
					"$format": "json"
				},
				filters: [
					new sap.ui.model.Filter("EmpId", sap.ui.model.FilterOperator.EQ, String(sSelectedEmpId)),
					new sap.ui.model.Filter("RequestId", sap.ui.model.FilterOperator.EQ, String(sRequestId)), // Added by Arnab
					new sap.ui.model.Filter("ActionId", sap.ui.model.FilterOperator.EQ, String(sActionId)), // Added by Arnab
					new sap.ui.model.Filter("UserId", sap.ui.model.FilterOperator.EQ, String(sUserId)) // Added by Arnab
				],
				success: function (oData) {

					if (oData.results && oData.results.length > 0) {
						var oSrvData = oData.results[0];

						// ✅ Store raw data in employeeModel
						oEmpModel.setData({
							formVisible: true,
							EmpId: oSrvData.EmpId || "",
							ActionId: oSrvData.ActionId,
							EmpName: oSrvData.EmpName || "",
							RequestId: oSrvData.RequestId || "",
							Emp: `${oSrvData.EmpId.replace(/^0+/, "")} - ${oSrvData.EmpName}` || "",
							SBU: `${oSrvData.SbuText} - ${oSrvData.OrgUnitText}` || "",
							Location: `${oSrvData.LocationText} - ${oSrvData.BuildingText}` || "",
							Designation: oSrvData.Designation || "",
							manager: `${oSrvData.ManagerId ? oSrvData.ManagerId.replace(/^0+/, "") : ""}-${oSrvData.ManagerName || ""}`,
							RM_Designation: oSrvData.ManagerDesig || "",
							MM_EmpID: oSrvData.MatrixManagerName.replace(/^0+/, "") || "",
							MM_Designation: oSrvData.MatrixManagerDesig || "",
							Hod: `${oSrvData.Hod1Id.replace(/^0+/, "")} - ${oSrvData.Hod1Name}` || "",
							Hod1Designation: oSrvData.Hod1Designation || "",
							NewRM: oSrvData.NewRm1Name || "",
							Status: oSrvData.Status || "",
							NewDesignation: oSrvData.NewDesignation || "",
							MatrixManagerSelected: !!(oSrvData.NewMatrixManagerId && oSrvData.NewMatrixManagerId.replace(/^0+/, ""))
						});
						// ENABLE FOOTER
						var oStateModel = oView.getModel("stateModel");

						if (oSrvData.SUBMIT === "X" && oSrvData.Edit !== "X") {
							oStateModel.setProperty("/isEditable", false);
							that.disableFooter();

						} else if (oSrvData.Edit === "X") {
							that.editButtonEnable()
						} else {
							that.enableFooter();
						}
						// ✅ Select employee in ComboBox
						oEmployeeModelId.setProperty("/EmplId", oSrvData.EmpId.replace(/^0+/, ""));
						// Added by Arnab - 26.06.2026
						oEmployeeModelId.setProperty("/AllEmployees", []);
						var aEmployees = oEmployeeModelId.getProperty("/AllEmployees");
						if (Array.isArray(aEmployees) && !aEmployees.length) {
							var empPayload = {
								"EmplId": oSrvData.EmpId,
								"EmplName": oSrvData.EmpName
							}
							oEmployeeModelId.getProperty("/AllEmployees").push(empPayload)
							oEmployeeModelId.refresh(true);
							oView.byId("idMangrCombox").setSelectedKey(oSrvData.EmpId);
						}

						oView.byId("empItems").setValue(oSrvData.EmpId + "" + "-" + "" + oSrvData.EmpName);
						oView.byId("empComboBoxHR").setEnabled(false);
						oView.byId("empItems").setEnabled(false);
						oView.byId("datePickerHR").setEnabled(false);

						// --- 🔹 Manager DatePicker ---
						var oDatePicker = that.byId("datePickerMGR");
						if (oDatePicker) {
							oDatePicker.setValue(""); // clear
							if (oSrvData.EffectiveDate) {
								var oDate = new Date(oSrvData.EffectiveDate);
								oDatePicker.setDateValue(oDate);
							}
						}

						// --- 🔹 Manager Action Select ---
						// var oActionSelect = that.byId("empComboBoxMGR"); // ✅ correct ID from XML
						// if (oActionSelect) {
						// 	oActionSelect.setSelectedKey(""); // clear first
						// 	var actionValue = (sActionText === "Confirmation" || sActionText === "Probation Extension") ?
						// 		"Confirmation / Probation Extension" : "";

						// 	var oMatch = aAllActions.find(function (oItem) {
						// 		return oItem.text === actionValue
						// 	});

						// 	if (oMatch) {
						// 		var sActionKey = oMatch.key;
						// 		oActionSelect.setSelectedKey(sActionKey);
						// 		if (oStateModel) {
						// 			oStateModel.setProperty("/selectedAction", sActionKey);
						// 			oStateModel.setProperty("/selectedRole", "MGR");
						// 		}
						// 		that._updateFragment();
						// 	}
						// }

						// ---  Manager Action Select ---
						var oActionSelect = that.byId("empComboBoxMGR");
						if (oActionSelect) {
							oActionSelect.setSelectedKey("");
							var mActionMap = {
								"Confirmation / Probation Extension": "C1",
								"Confirmation": "C1",
								"Probation Extension": "C1",
								"Re-designation": "R1",
								"Retirement": "R2",
								"Transfer": "T1"
							};
							var sActionKey = mActionMap[sActionText] || "";
							if (sActionKey) {
								// Determine role based on action
								var sRole = (sActionKey === "R1" ||
									sActionKey === "R2" ||
									sActionKey === "T1") ? "HR" : "MGR";
								oActionSelect.setSelectedKey(sActionKey);
								if (oStateModel) {
									oStateModel.setProperty("/selectedAction", sActionKey);
									oStateModel.setProperty("/selectedRole", sRole);
								}
								// Switch tab BEFORE loading fragment so the container is rendered
								var oTabBar = that.byId("roleActionTabBar");
								if (oTabBar) {
									oTabBar.setSelectedKey(sRole);
								}
								that.sSelectedTab = sRole;

								var oFragmentPromise = that._updateFragment();

								if (oFragmentPromise) {
									oFragmentPromise.then(function () {
										var oNewDesig = oView.byId("newDesignation");
										if (oNewDesig && oSrvData.NewDesignation) {
											oNewDesig.setValue(oSrvData.NewDesignation);
										}
										var oNewRM = oView.byId("newRMItems");
										if (oNewRM && oSrvData.NewRm1Name) {
											var sRmValue = oSrvData.NewRm1Name;
											if (oSrvData.NewRm1Id) {
												sRmValue = sRmValue + " - " + oSrvData.NewRm1Id.replace(/^0+/, "");
											}
											oNewRM.setValue(sRmValue);
										}
										if (oSrvData.NewMatrixManagerId && oSrvData.NewMatrixManagerId.replace(/^0+/, "")) {
											that.onMatrixCheck(true);
											var oMatrixInput = oView.byId("matrxMngrEmpId");
											if (oMatrixInput) {
												var sMatrixVal = oSrvData.NewMatrixManagerName || "";
												if (oSrvData.NewMatrixManagerId) {
													sMatrixVal = sMatrixVal + " - " + oSrvData.NewMatrixManagerId.replace(/^0+/, "");
												}
												oMatrixInput.setValue(sMatrixVal);
											}
										}
									});
								}
							}
						}

						// --- 🔹 Show/Hide Boxes (if still used somewhere)
						var oShowHideModel = oView.getModel("showHideModel");
						if (oShowHideModel) {
							oShowHideModel.setProperty("/VisibleConfirmationBox", sActionText === "Confirmation");
							oShowHideModel.setProperty("/VisibleReDesignationBox", sActionText === "Re-Designation");
							oShowHideModel.setProperty("/VisibleRetirementBox", sActionText === "Retirement");
							oShowHideModel.setProperty("/VisibleTransferBox", sActionText === "Transfer");
						}

						// Custom model handler if required
						that.setEmployeeAndFeedbackModel(oSrvData);

					} else {
						oView.setBusy(false);
						sap.m.MessageToast.show("No data found for selected employee.");
						oEmpModel.setData({});
					}
					oView.setBusy(false);
				},
				error: function (oError) {
					oView.setBusy(false);
					console.error("Error fetching employee details:", oError);
					sap.m.MessageToast.show("Failed to fetch employee details.");
				}
			});
		},
		onSubmit: function () {
			sap.m.MessageBox.confirm("Are you sure you want to submit?", {
				title: "Confirm",
				actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
				emphasizedAction: sap.m.MessageBox.Action.YES,
				onClose: function (sAction) {
						if (sAction === sap.m.MessageBox.Action.YES) {
							this.onSubmitPress();
						}
					}.bind(this) // Important: bind 'this' to maintain context
			});
		},
		onSubmitPress: function (oEvent) {
			var oView = this.getView();
			var oFeedback = oView.getModel("feedbackModel").getData();
			// 	sOperation = oEvent ? oEvent.getSource().data("operation") : "SUB";
			var oEffDateEMP = oView.byId("datePickerEMP").getDateValue();
			var oEffDateMGR = oView.byId("datePickerMGR").getDateValue();
			var oEffDateHR = oView.byId("datePickerHR").getDateValue();
			var dateInst = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd"
			});
			var selectedDate = oEffDateEMP || oEffDateMGR || oEffDateHR;
			var DateV = selectedDate ? dateInst.format(new Date(selectedDate)) + "T00:00:00" : null;
			SubmitHelperHRBP.submitRequest(this, oEvent, oFeedback, DateV);

		},
		onEdit: function () {
			sap.m.MessageBox.warning(
				"Editing will permanently wipe the data. Do you want to proceed?", {
					title: "Warning",
					actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
					emphasizedAction: sap.m.MessageBox.Action.YES,
					onClose: function (sAction) {
						if (sAction === sap.m.MessageBox.Action.YES) {
							this.editAction();
						}
					}.bind(this)
				}
			);
		},
		editAction: function () {
			var oView = this.getView();
			var oEmpData = oView.getModel("employeeModel").getData();
			var oModel = oView.getModel();
			var oEntry = {
				Operation: 'EDT',
				ActionId: oEmpData.ActionId,
				EmpId: oEmpData.EmpId
			}
			var that = this;
			oView.setBusy(true);
			oModel.create("/MyWorkListCnfrmSet", oEntry, {
				success: function (oData, response) {

					that.onEmployeeSelect(oEmpData.EmpId)
					that.enableFooter();
					that.loadTrackClaimsData()
					oView.setBusy(false);
					// var oTabBar = that.byId("roleActionTabBar");
					// if (oTabBar) {
					// 	oTabBar.setSelectedKey("TRACK");
					// }
				},
				error: function (oError) {
					oView.setBusy(false);
					sap.m.MessageBox.error("Edit failed!");
				}
			});
		},
		_validateInputs: function (oFeedback, oEffDate) {
			var aMissingFields = [];

			// Effective Date check
			if (!oEffDate) {
				aMissingFields.push("Effective Date");
			}

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
			// CONFIRMATION ELIGIBILITY VALIDATION
			const oModel = this.getView().getModel("feedbackModel");
			const ratings = [
				oFeedback.Quantity,
				oFeedback.Quality,
				oFeedback.Responsibility,
				oFeedback.Teamwork,
				oFeedback.Time
			].filter(Boolean);

			const belowExpectations = ratings.includes("BELOW EXPECTATIONS");
			const satisfactoryCount = ratings.filter(r => r === "SATISFACTORY").length;
			const probationStatus = oFeedback.ProbationStatus;
			let confirmationAllowed = true;

			if (probationStatus === 1) {
				oModel.setProperty("/confirmationAllowed", true);
			} else {
				// Only check confirmation eligibility if probation status is 0 (Confirmation)
				if (belowExpectations || satisfactoryCount > 1) {
					confirmationAllowed = false;
					// Push error to aMissingFields instead of showing separate MessageBox
					aMissingFields.push("You cannot recommend confirmation with this set of ratings");
				}
				oModel.setProperty("/confirmationAllowed", confirmationAllowed);
			}
			// If any field missing, show bullet-style message
			if (aMissingFields.length > 0) {
				// const sMessage =
				// 	"Please check the following points before submitting:\n\n• " +
				// 	aMissingFields.join("\n• ");

				//Added by Arnab.
				const sMessage =
					"Please check the following points before submitting:\n\n\u2022 " +
					aMissingFields.join("\n\u2022 ");

				sap.m.MessageBox.error(sMessage);
				return false; // ❌ validation failed
			}

			return true; // ✅ validation passed
		},
		loadTrackClaimsData: function () {
			var oView = this.getView();
			var oUser = sap.ushell.Container.getUser();

			// Create or reuse claimsModel
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

			var that = this;
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
		},
		showHideModel: function () {
			var oViewshowHideModel = new JSONModel({
				VisibleConfirmationBox: false,
				VisibleReDesignationBox: false,
				VisibleRetirementBox: false,
				VisibleTransferBox: false
			});
			this.setModel(oViewshowHideModel, "showHideModel");
			this.getView().getModel("showHideModel").refresh(true);

			var oView = this.getView();
			var oEmpModel = new sap.ui.model.json.JSONModel({
				formVisible: false // hidden by default
			});
			oView.setModel(oEmpModel, "employeeModel");
		},
		areAllBoxesHidden: function (bConfirm, bReDesig, bRetire, bTransfer) {
			console.log("Values:", bConfirm, bReDesig, bRetire, bTransfer);
			return !bConfirm && !bReDesig && !bRetire && !bTransfer;
		},
		onTabSelect: function (oEvent) {
			var oView = this.getView(); //Added by Arnab - 09.06.2026.
			const oIconTabBar = this.byId("taskTabBar");
			const sSelectedKey = oEvent.getParameter("key");
			const sCurrentKey = oIconTabBar.getSelectedKey();
			const oEmployeeModel = this.getView().getModel("employeeModelId");
			const sSelectedEmployeeId = oEmployeeModel.getProperty("/EmplId");

			//Start of Adding by Arnab - 09.06.2026
			var oComboBox = this.byId("empComboBoxHR");
			oComboBox.setSelectedKey("");
			oView.getModel("stateModel").setProperty("/actionEnabled", true);
			//End of Adding by Arnab - 09.06.2026

			if (sCurrentKey !== "newTask" && sSelectedEmployeeId) {
				oEvent.preventDefault();

				if (!this._oConfirmDialog) {
					this._oConfirmDialog = new sap.m.Dialog({
						title: "Confirm",
						type: "Message",
						content: new sap.m.Text({
							text: "Are you sure you want to move to the next tab?"
						}),
						beginButton: new sap.m.Button({
							text: "Yes",
							press: function () {
								this._oConfirmDialog.close();
								oIconTabBar.setSelectedKey("taskList");
							}.bind(this)
						}),
						endButton: new sap.m.Button({
							text: "Cancel",
							press: function () {
								this._oConfirmDialog.close();
								oIconTabBar.setSelectedKey("newTask");
							}.bind(this)
						})
					});
				}

				this._oConfirmDialog.open();
			}

		},

		onPressPopover: function (oEvent) {
			var oButton = oEvent.getSource();
			var sParamKey = oButton.getCustomData()[0].getValue(); // "Quantity of Output" etc.
			var aRatings = this._ratingData[sParamKey];

			if (!this._oPopover) {
				this._oPopover = new sap.m.Popover({
					placement: sap.m.PlacementType.Bottom,
					title: "Rating Guide",
					contentWidth: "800px",
					content: [
						new sap.m.Table({
							id: this.createId("ratingGuideTable"),
							fixedLayout: false,
							columns: [
								// new sap.m.Column({
								// 	header: new sap.m.Label({
								// 		text: "Parameters"
								// 	})
								// }),
								new sap.m.Column({
									header: new sap.m.Label({
										text: "EXCELLENT"
									})
								}),
								new sap.m.Column({
									header: new sap.m.Label({
										text: "VERY GOOD"
									})
								}),
								new sap.m.Column({
									header: new sap.m.Label({
										text: "GOOD"
									})
								}),
								new sap.m.Column({
									header: new sap.m.Label({
										text: "SATISFACTORY"
									})
								}),
								new sap.m.Column({
									header: new sap.m.Label({
										text: "BELOW EXPECTATIONS"
									})
								})
							],
							items: []
						})
					]
				});
			}

			// Dynamically build the row for the clicked parameter
			var oTable = sap.ui.getCore().byId(this.createId("ratingGuideTable"));
			oTable.removeAllItems(); // Clear previous content

			if (aRatings) {
				oTable.addItem(new sap.m.ColumnListItem({
					cells: [
						new sap.m.Text({
							text: aRatings[0]
						}),
						new sap.m.Text({
							text: aRatings[1]
						}),
						new sap.m.Text({
							text: aRatings[2]
						}),
						new sap.m.Text({
							text: aRatings[3]
						}),
						new sap.m.Text({
							text: aRatings[4]
						}),
						new sap.m.Text({
							text: aRatings[5]
						})
					]
				}));
			}

			this._oPopover.openBy(oButton);
		},
		onAnyBoxVisible: function () {
			const model = this.getView().getModel("showHideModel");
			if (!model) {
				return false;
			}

			const data = model.getData();
			return data.VisibleConfirmationBox ||
				data.VisibleReDesignationBox ||
				data.VisibleRetirementBox ||
				data.VisibleTransferBox;
		},
		onBackPress: function () {
			// Reset Employee Model (empties employee details form)
			var oView = this.getView();
			var oStateModel = oView.getModel("stateModel");
			var oEmpModel = oView.getModel("employeeModel");
			if (oEmpModel) {
				oEmpModel.setData({});
			}
			oStateModel.setProperty("/isEditable", true)
				// Reset Feedback Model (empties ratings, comments, radio buttons)
			var oFeedbackModel = oView.getModel("feedbackModel");
			if (oFeedbackModel) {
				oFeedbackModel.setData({
					Ratings: [], // keep empty, or reset to original Ratings list if you have one
					Quantity: "",
					Quality: "",
					Responsibility: "",
					Teamwork: "",
					Time: "",
					ProbationStatus: -1,
					CommentRM1: "",
					CommentRM2: "",
					CommentRM3: "",
					CommentHOD: "",
					CommentHOD2: "",
					CommentHRBP: "",
					CommentCHRO: ""
				});
			}
			var aSelectIds = ["empComboBoxEMP", "empComboBoxMGR", "empComboBoxHR"];
			aSelectIds.forEach(function (sId) {
				var oSelect = this.byId(sId);
				if (oSelect) {
					oSelect.setSelectedKey("");
				}
			}.bind(this));
			this.showHideModel();
			this._clearFormValues();

			oView.getModel("stateModel").setProperty("/actionEnabled", true); //Added by Arnab - 10.06.2026

			//HRBP Action
			if (this.sSelectedTab === "HR") {
				this._clearEmployeeSection();
				if (this._oCurrentFragment) {
					this._oCurrentFragment.destroy();
					this._oCurrentFragment = null;
				}
				var oContainer = this.byId("fragmentContainerHR");
				if (oContainer) {
					oContainer.removeAllItems();
				}
			}
			//Manager Action
			if (this.sSelectedTab === "MGR") {
				if (this._oCurrentFragment) {
					this._oCurrentFragment.destroy();
					this._oCurrentFragment = null;
				}
				var oContainer = this.byId("fragmentContainerMGR");
				if (oContainer) {
					oContainer.removeAllItems();
				}
			}

			this.compeleteDisableFooter();
		},

		onSelectChange: function (oEvent) {
			// const sKey = oEvent.getSource().getSelectedKey();
			const sKey = oEvent.getSource().getSelectedKey();
			const oModel = this.getView().getModel("showHideModel");

			// var sRole = this.getView().byId("roleComboBox").getSelectedKey();

			// if (!sRole) {
			// 	// No role selected → show warning and stop
			// 	sap.m.MessageToast.show("Please select a role first");
			// 	return;
			// } else {
			// oModel.setProperty("/IsExtended", false);
			oModel.setProperty("/VisibleConfirmationBox", sKey === "C1");
			oModel.setProperty("/VisibleReDesignationBox", sKey === "R1");
			oModel.setProperty("/VisibleRetirementBox", sKey === "R2");
			oModel.setProperty("/VisibleTransferBox", sKey === "T1");
			// }

		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Triggered by the table's 'updateFinished' event: after new table
		 * data is available, this handler method updates the table counter.
		 * This should only happen if the update was successful, which is
		 * why this handler is attached to 'updateFinished' and not to the
		 * table's list binding's 'dataReceived' method.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished: function (oEvent) {
			// update the worklist's object counter after the table update
			var sTitle,
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");
			// only update the counter if the length is final and
			// the table is not empty
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
			} else {
				sTitle = this.getResourceBundle().getText("worklistTableTitle");
			}
			this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
		},

		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
		onPress: function (oEvent) {
			// The source is the list item that got pressed
			this._showObject(oEvent.getSource());
		},

		/**
		 * Event handler for navigating back.
		 * We navigate back in the browser history
		 * @public
		 */
		onNavBack: function () {
			// eslint-disable-next-line sap-no-history-manipulation
			history.go(-1);
		},
		setEmployeeAndFeedbackModel: function (oSrvData) {
			const bReadOnly = oSrvData && (oSrvData.SUBMIT === "X" || oSrvData.Edit === "X");

			let probationStatus = -1;
			if (oSrvData.Confirmation === true) {
				probationStatus = 0;
			} else if (oSrvData.ExtensionOfProbation === true) {
				probationStatus = 1;
			}
			const oFeedbackModel = new sap.ui.model.json.JSONModel({
				Ratings: [{
					key: 1,
					text: "EXCELLENT"
				}, {
					key: 2,
					text: "VERY GOOD"
				}, {
					key: 3,
					text: "GOOD"
				}, {
					key: 4,
					text: "SATISFACTORY"
				}, {
					key: 5,
					text: "BELOW EXPECTATIONS"
				}],
				// ✅ map from OData only if value exists
				Quantity: oSrvData && oSrvData.QuntityOfOutput ? oSrvData.QuntityOfOutput : "",
				Quality: oSrvData && oSrvData.QalityOfOutput ? oSrvData.QalityOfOutput : "",
				Responsibility: oSrvData && oSrvData.SenseOfResponsibility ? oSrvData.SenseOfResponsibility : "",
				Teamwork: oSrvData && oSrvData.TeamworkAndCollaboration ? oSrvData.TeamworkAndCollaboration : "",
				Time: oSrvData && oSrvData.TimeManagementAndDiscipline ? oSrvData.TimeManagementAndDiscipline : "",

				CommentRM1: oSrvData && oSrvData.Rm1Comment ? oSrvData.Rm1Comment : "",
				CommentRM2: oSrvData && oSrvData.Rm2Comment ? oSrvData.Rm2Comment : "",
				Rm2Approver: oSrvData && oSrvData.Rm2Approver ? oSrvData.Rm2Approver : "",
				CommentRM3: oSrvData && oSrvData.Rm3Comment ? oSrvData.Rm3Comment : "",
				Rm3Approver: oSrvData && oSrvData.Rm3Approver ? oSrvData.Rm3Approver : "",

				CommentHOD: oSrvData && oSrvData.Hod1Comment ? oSrvData.Hod1Comment : "",
				Hod1Approver: oSrvData && oSrvData.Hod1Approver ? oSrvData.Hod1Approver : "",

				CommentHOD2: oSrvData && oSrvData.Hod2Comment ? oSrvData.Hod2Comment : "",
				Hod2Approver: oSrvData && oSrvData.Hod2Approver ? oSrvData.Hod2Approver : "",

				CommentCHRO: oSrvData && oSrvData.ChroComment ? oSrvData.ChroComment : "",
				ChroApprover: oSrvData && oSrvData.ChroApprover ? oSrvData.ChroApprover : "",

				CommentHRBP: oSrvData && oSrvData.HrbpComment ? oSrvData.HrbpComment : "",
				HrbpApprover: oSrvData && oSrvData.HrbpApprover ? oSrvData.HrbpApprover : "",

				IsConfirmed: oSrvData && oSrvData.Confirmation ? oSrvData.Confirmation : false,
				IsExtended: oSrvData && oSrvData.ExtensionOfProbation ? oSrvData.ExtensionOfProbation : false,
				ProbationStatus: probationStatus,
				readOnly: bReadOnly,
				Rm2Name: `${oSrvData.Rm2Id.replace(/^0+/, "")} - ${oSrvData.Rm2Name}`,
				Rm3Name: `${oSrvData.Rm3Id.replace(/^0+/, "")} - ${oSrvData.Rm3Name}`,
				Hod1Name: `${oSrvData.Hod1Id.replace(/^0+/, "")} - ${oSrvData.Hod1Name}`,
				Hod2Name: `${oSrvData.Hod2Id.replace(/^0+/, "")} - ${oSrvData.Hod2Name}`,
				ChroName: `${oSrvData.ChroId.replace(/^0+/, "")} - ${oSrvData.ChroName}`,
				HrbpName: `${oSrvData.HrbpId.replace(/^0+/, "")} - ${oSrvData.HrbpName}`,
			});

			this.getView().setModel(oFeedbackModel, "feedbackModel");
		},
		onSearch: function (oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
			} else {
				var aTableSearchState = [];
				var sQuery = oEvent.getParameter("query");

				if (sQuery && sQuery.length > 0) {
					aTableSearchState = [new Filter("Letyp", FilterOperator.Contains, sQuery)];
				}
				this._applySearch(aTableSearchState);
			}
		},
		// SORT FILTER AND GROUP FUNCTION
		onSort: function () {
			if (!this._oViewSettingsDialog) {
				this._oViewSettingsDialog = sap.ui.xmlfragment(
					"empletter.zemployeeletter.Fragments.ViewSettingsDialog",
					this
				);
				this.getView().addDependent(this._oViewSettingsDialog);
			}
			this._oViewSettingsDialog.open("sort");
		},

		onFilter: function () {
			if (!this._oViewSettingsDialog) {
				this._oViewSettingsDialog = sap.ui.xmlfragment(
					"empletter.zemployeeletter.Fragments.ViewSettingsDialog",
					this
				);
				this.getView().addDependent(this._oViewSettingsDialog);
			}
			this._oViewSettingsDialog.open("filter");
		},

		onGroup: function () {
			if (!this._oViewSettingsDialog) {
				this._oViewSettingsDialog = sap.ui.xmlfragment(
					"empletter.zemployeeletter.Fragments.ViewSettingsDialog",
					this
				);
				this.getView().addDependent(this._oViewSettingsDialog);
			}
			this._oViewSettingsDialog.open("group");
		},

		onConfirmViewSettings: function (oEvent) {
			var oTable = this.byId("idClaimsTable");
			var oBinding = oTable.getBinding("items");
			var mParams = oEvent.getParameters();
			var aSorters = [];
			var aFilters = [];
			var aGroups = [];

			// Handle sorting
			if (mParams.sortItem) {
				var sSortPath = mParams.sortItem.getKey();
				var bDescending = mParams.sortDescending;
				aSorters.push(new sap.ui.model.Sorter(sSortPath, bDescending));
			}

			// Handle grouping
			if (mParams.groupItem) {
				var sGroupPath = mParams.groupItem.getKey();
				var bDescending = mParams.groupDescending;
				aSorters.push(new sap.ui.model.Sorter(sGroupPath, bDescending, true));
			}

			// Handle filtering
			if (mParams.filterItems && mParams.filterItems.length > 0) {
				mParams.filterItems.forEach(function (oItem) {
					var sPath = oItem.getKey();
					var sValue = oItem.getText();
					aFilters.push(new sap.ui.model.Filter(sPath, sap.ui.model.FilterOperator.Contains, sValue));
				});
			}

			// Apply filters and sorters
			oBinding.filter(aFilters);
			oBinding.sort(aSorters);
		},

		onResetViewSettings: function () {
			var oTable = this.byId("idClaimsTable");
			var oBinding = oTable.getBinding("items");
			oBinding.filter([]);
			oBinding.sort([]);
		},
		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh: function () {
			var oTable = this.byId("table");
			oTable.getBinding("items").refresh();
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Shows the selected item on the object page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showObject: function (oItem) {
			this.getRouter().navTo("object", {
				objectId: oItem.getBindingContext().getProperty("Letyp")
			});
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
		 * @private
		 */
		_applySearch: function (aTableSearchState) {
			var oTable = this.byId("table"),
				oViewModel = this.getModel("worklistView");
			oTable.getBinding("items").filter(aTableSearchState, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aTableSearchState.length !== 0) {
				oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
			}
		},
		enableFooter: function () {
			var oFooterModel = this.getOwnerComponent().getModel("footerModel");
			oFooterModel.setData({
				visible: true,
				saveEnabled: true,
				submitEnabled: true,
				cancelEnabled: true,
				isEdit: false,
			});
		},
		editButtonEnable: function () {
			var oFooterModel = this.getOwnerComponent().getModel("footerModel");
			oFooterModel.setData({
				visible: true,
				saveEnabled: false,
				submitEnabled: false,
				cancelEnabled: false,
				isEdit: true,
			});
		},
		disableFooter: function () {
			var oFooterModel = this.getOwnerComponent().getModel("footerModel");
			oFooterModel.setData({
				visible: true,
				saveEnabled: false,
				submitEnabled: false,
				cancelEnabled: true,
				isEdit: false
			});
		},
		compeleteDisableFooter: function () {
			var oFooterModel = this.getOwnerComponent().getModel("footerModel");
			oFooterModel.setData({
				visible: false,
				saveEnabled: false,
				submitEnabled: false,
				cancelEnabled: false,
				isEdit: false
			});
		},

		// Load track claims filter code
		onSearch: function (oEvent) {
			const sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue");
			const oTable = this.byId("idClaimsTable");

			// Ensure correct binding with named model
			const oBinding = oTable.getBinding("items");

			if (!oBinding) {
				console.error("No binding found on idClaimsTable");
				return;
			}

			if (sQuery && sQuery.trim() !== "") {
				const aFilters = [
					new sap.ui.model.Filter("RequestId", sap.ui.model.FilterOperator.Contains, sQuery),
					new sap.ui.model.Filter("UserId", sap.ui.model.FilterOperator.Contains, sQuery),
					new sap.ui.model.Filter("EmpName", sap.ui.model.FilterOperator.Contains, sQuery),
					new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.Contains, sQuery),
					new sap.ui.model.Filter("NextAprvr", sap.ui.model.FilterOperator.Contains, sQuery),
					new sap.ui.model.Filter("ActionText", sap.ui.model.FilterOperator.Contains, sQuery),
					new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.Contains, sQuery),
					new sap.ui.model.Filter("EffectiveDate", sap.ui.model.FilterOperator.Contains, sQuery)
				];

				const oCombinedFilter = new sap.ui.model.Filter({
					filters: aFilters,
					and: false // OR condition across fields
				});

				oBinding.filter([oCombinedFilter]); // <- important
			} else {
				oBinding.filter([]); // clear filter
			}
		},
		_getVisibleTable: function () {
			// Since you only have one table, we return it directly
			var oTable = this.byId("idClaimsTable");
			if (!oTable) {
				console.warn("Table not found: idClaimsTable");
			}
			return oTable;
		},

		onExportSpreadsheet: function () {
			var oTable = this._getVisibleTable();
			if (!oTable) return;

			// Get rows (filtered or all)
			var oBinding = oTable.getBinding("items");
			var aItems = oBinding && oBinding.getContexts ? oBinding.getContexts().map(ctx => ctx.getObject()) : oTable.getModel(
					"claimsModel")
				.getData();

			// Get table columns
			var aColumns = oTable.getColumns();

			// Build export columns dynamically
			var aExportColumns = aColumns.map((col, index) => {
				// Use column header text as label
				var sLabel = col.getHeader() && col.getHeader().getText ? col.getHeader().getText() : "Column" + index;

				// Get binding from cell in first row
				var sProperty = "";
				var oFirstItem = oTable.getItems()[0];
				if (oFirstItem) {
					var oCell = oFirstItem.getCells()[index];
					var oBindingInfo = oCell.getBindingInfo("text");
					if (oBindingInfo && oBindingInfo.parts && oBindingInfo.parts.length > 0) {
						sProperty = oBindingInfo.parts[0].path;
					}
				}

				return {
					label: sLabel,
					property: sProperty,
					type: sap.ui.export.EdmType.String
				};
			});

			// Map row data
			var aExportData = aItems.map(oRow => {
				var oJSONRow = {};
				aExportColumns.forEach(col => {
					oJSONRow[col.property] = oRow[col.property];
				});
				return oJSONRow;
			});

			// Export
			sap.ui.getCore().loadLibrary("sap.ui.export", {
				async: true
			}).then(function () {
				sap.ui.require(["sap/ui/export/Spreadsheet"], function (Spreadsheet) {
					var oSheet = new Spreadsheet({
						workbook: {
							columns: aExportColumns
						},
						dataSource: aExportData,
						fileName: "Track_Claims.xlsx",
						showProgress: false
					});
					oSheet.build().finally(() => oSheet.destroy());
				});
			});
		},
		onShowFullDesignation: function (oEvent) {
			var oInput = oEvent.getSource();
			var sValue = oInput.getValue();

			if (!this._oDesignationPopover) {
				this._oDesignationPopover = new sap.m.ResponsivePopover({
					title: "Full Designation",
					contentWidth: "300px",
					contentHeight: "auto",
					placement: "Auto",
					content: [
						new sap.m.Text({
							text: sValue,
							wrapping: true
						})
					]
				});
			} else {
				this._oDesignationPopover.removeAllContent();
				this._oDesignationPopover.addContent(new sap.m.Text({
					text: sValue,
					wrapping: true
				}));
			}

			this._oDesignationPopover.openBy(oInput);
		},

		// Added by Arnab
		onMatrixCheck: function (oEvent) {
			var oView = this.getView();
			var bIsSelected;
			if (oEvent && typeof oEvent.getSource === "function") {
				bIsSelected = oEvent.getSource().getSelected();
			} else {
				bIsSelected = oEvent === true || oEvent === "X";
			}
			Common.toggleMatrixManagerField(oView, bIsSelected);
		},
		// Added by Arnab - 28.05.2026
		_setActionDropdown: function () {
			var oStateModel = this.getView().getModel("stateModel");
			var aActions = [];
			aActions.push({
				key: "R1",
				text: "Re-Designation"
			}, {
				key: "R2",
				text: "Retirement"
			}, {
				key: "T1",
				text: "Transfer"
			});
			oStateModel.setProperty("/Actions", aActions);
			oStateModel.refresh(true);
		},
		// Added by Arnab - 01.06.2026
		handleDateChange: function (oEvent) {
			this.oSelectedDateCopy = structuredClone(oEvent.getSource().getDateValue());
			var sValue = this.byId("empItems").getValue();
			var sEmpId = "";
			if (sValue && sValue.includes("-")) {
				sEmpId = sValue.split("-")[1].trim();
			}
			if (!this._validateForm()) {
				sap.m.MessageToast.show("Please fill all mandatory fields");
				return;
			}
			// this.onBackPress();

			if (this.sSelectedTab === "HR") {
				if (this._oCurrentFragment) {
					this._oCurrentFragment.destroy();
					this._oCurrentFragment = null;
				}
				var oContainer = this.byId("fragmentContainerMGR");
				if (oContainer) {
					oContainer.removeAllItems();
				}
			}

			this.showHideModel();
			this._updateFragment();
			this.onEmployeeSelect(sEmpId);
			this.getNewSBUSet();
			this.getNewLocationSet();
		},
		// Added by Arnab - 02.06.2026
		// fix By: Abhik
		// Issue: When a user types in the Employee Input field (empItems) on the HRBP Action tab, the suggestion dropdown is slow to populate.
		_loadEmployeeDropdown: function (sUserId, sRequestKey) {
			var oDataModel = this.getOwnerComponent().getModel();
			var aFilters = [
				new sap.ui.model.Filter("UserId", sap.ui.model.FilterOperator.EQ, sUserId),
				new sap.ui.model.Filter("RequestID", sap.ui.model.FilterOperator.EQ, sRequestKey)
			];
			oDataModel.read("/EmpIdDropDown", {
				filters: aFilters,
				success: function (oData) {
					var oJsonModel = this.getView().getModel("employeeModelId");
					if (oJsonModel) {
						oJsonModel.setProperty("/AllEmployees", oData.results);
					} else {
						oJsonModel = new sap.ui.model.json.JSONModel({ AllEmployees: oData.results });
						this.getView().setModel(oJsonModel, "employeeModelId");
					}
				}.bind(this),
				error: function (oError) {
					console.log("Error loading employee dropdown", oError);
				}
			});
		},
		onEmployeeLiveSearch: function (oEvent) {
			var sValue = oEvent.getParameter("suggestValue");
			if (!sValue) {
				return;
			}
			if (this._employeeSearchTimer) {
				clearTimeout(this._employeeSearchTimer);
			}
			this._employeeSearchTimer = setTimeout(function () {
				this._callEmployeeSearch(sValue);
			}.bind(this), 400);
		},
		_callEmployeeSearch: function (sValue) {
			var oView = this.getView();
			var oUser = sap.ushell.Container.getUser().getId();
			var oStateModel = oView.getModel("stateModel");
			var oDataModel = this.getOwnerComponent().getModel();
			var oUserId = oUser;
			var sKeyValue = oStateModel.getProperty("/selectedAction");

			this._employeeSearchSeq = (this._employeeSearchSeq || 0) + 1;
			var iSeq = this._employeeSearchSeq;

			var aFilters = [
				new sap.ui.model.Filter(
					"UserId",
					sap.ui.model.FilterOperator.EQ,
					oUserId
				),
				new sap.ui.model.Filter(
					"RequestID",
					sap.ui.model.FilterOperator.EQ,
					sKeyValue
				),
				new sap.ui.model.Filter(
					"SearchText",
					sap.ui.model.FilterOperator.Contains,
					sValue
				)
			];
			oDataModel.read("/EmpIdDropDown", {
				filters: aFilters,
				success: function (oData) {
					if (iSeq !== this._employeeSearchSeq) {
						return;
					}
					var oJsonModel = this.getView().getModel("employeeModelId");
					if (oJsonModel) {
						oJsonModel.setProperty("/AllEmployees", oData.results);
					} else {
						oJsonModel = new sap.ui.model.json.JSONModel({
							AllEmployees: oData.results
						});
						this.getView().setModel(oJsonModel, "employeeModelId");
					}
				}.bind(this),
				error: function (oError) {
					console.log("Error in search", oError);
				}
			});
		},
		newRMSearch: function (oEvent) {
			var oView = this.getView();
			var sKeyValue = oEvent.getParameter("value");
			var oDataModel = this.getOwnerComponent().getModel();
			if (!sKeyValue || sKeyValue.length < 3) {
				return;
			}
			var aFilters = [
				new sap.ui.model.Filter(
					"EmplId",
					sap.ui.model.FilterOperator.Contains,
					sKeyValue
				)
			];
			oDataModel.read("/NewRMSet", {
				filters: aFilters,
				success: function (oData) {
					this.getView().setModel(
						new sap.ui.model.json.JSONModel(oData),
						"newRMModel"
					);
				}.bind(this),
				error: function (oError) {
					sap.m.MessageToast.show("Unable to load data");
				}
			});
		},
		getMatrixManagerSet: function (oEvent) {
			var oView = this.getView();
			var sKValue = oEvent.getParameter("value");
			var oModel = this.getOwnerComponent().getModel();
			if (!sKValue || sKValue.length < 3) {
				return;
			}
			var aFilters = [
				new sap.ui.model.Filter(
					"EmplId",
					sap.ui.model.FilterOperator.Contains,
					sKValue
				)
			];
			oModel.read("/MatrxMngrEmpSet", {
				filters: aFilters,
				success: function (oData) {
					this.getView().setModel(
						new sap.ui.model.json.JSONModel(oData),
						"MatrxMngrEmpSetModel"
					);
				}.bind(this),
				error: function (oError) {
					sap.m.MessageToast.show("Unable to load data");
				}
			});
		},
		onDesignationLiveChange: function (oEvent) {
			var oView = this.getView();
			var sValue = oEvent.getParameter("value").toUpperCase();
			oEvent.getSource().setValue(sValue);
			// oView.getModel("empModel").setProperty("/NewDesignation", sValue);
		},
		_validateForm: function () {
			var bValid = true;
			var oRequest = this.byId("empComboBoxHR");
			var oEmployee = this.byId("empItems");
			var oDate = this.byId("datePickerHR");
			// Reset previous states
			oRequest.setValueState("None");
			oEmployee.setValueState("None");
			oDate.setValueState("None");
			// Request validation
			if (!oRequest.getSelectedKey()) {
				oRequest.setValueState("Error");
				oRequest.setValueStateText("Request is required");
				bValid = false;
			}
			// Employee validation
			if (!oEmployee.getValue()) {
				oEmployee.setValueState("Error");
				oEmployee.setValueStateText("Employee is required");
				bValid = false;
			}
			// Date validation
			if (!oDate.getDateValue()) {
				oDate.setValueState("Error");
				oDate.setValueStateText("Effective Date is required");
				bValid = false;
			}
			return bValid;
		},
		// Added by Arnab - 11.06.2026
		_clearEmployeeSection: function () {
			// Clear controls
			var oEmpInput = this.byId("empItems");
			var oDatePicker = this.byId("datePickerHR");
			if (oEmpInput) {
				oEmpInput.setValue("");
				oEmpInput.setValueState("None");
			}
			if (oDatePicker) {
				oDatePicker.setDateValue(null);
				oDatePicker.setValueState("None");
			}
			// Clear employee model
			var oEmployeeModel = this.getView().getModel("employeeModel");
			if (oEmployeeModel) {
				oEmployeeModel.setProperty("/EmpId", "");
				oEmployeeModel.setProperty("/Emp", "");
				oEmployeeModel.setProperty("/RequestId", "");
				oEmployeeModel.setProperty("/Status", "");
				oEmployeeModel.setProperty("/EffectiveDate", null);
			}
			// Clear employee search result model
			var oEmployeeModelId = this.getView().getModel("employeeModelId");
			if (oEmployeeModelId) {
				oEmployeeModelId.setData({
					AllEmployees: []
				});
			}
		},
		// Added by Arnab 11.06.2026
		getNewSBUSet: function () {
			this._loadOData(
				"/NewSBUSet", [], "newSBUModel"
			);
		},
		onNewSBUChange: function (oEvent) {
			var oSelectedItem = oEvent.getSource().getSelectedItem();
			if (!oSelectedItem) {
				return;
			}
			var sSBUCode = oSelectedItem.getKey();
			this.getNewOrgUnitSet(sSBUCode);
		},
		getNewOrgUnitSet: function (sSBUCode) {
			var aFilters = [
				new sap.ui.model.Filter(
					"SBUCode",
					sap.ui.model.FilterOperator.EQ,
					sSBUCode
				)
			];
			this._loadOData(
				"/NewOrgUnitSet", aFilters, "newOrgUnitModel"
			);
		},
		_loadOData: function (sPath, aFilters, sModelName) {
			var oModel = this.getOwnerComponent().getModel();
			var oView = this.getView();
			oModel.read(sPath, {
				filters: aFilters || [],
				success: function (oData) {
					oView.setModel(
						new sap.ui.model.json.JSONModel(oData),
						sModelName
					);
				}.bind(this),
				error: function (oError) {
					console.error("OData load failed for " + sPath, oError);
				}
			});
		},
		// Added by Arnab 11.06.2026
		getNewLocationSet: function () {
			this._loadOData(
				"/NewLocationSet", [], "newLocationModel"
			);
		},
		onNewLocSelectionChange: function (oEvent) {
			var oSelectedItem = oEvent.getSource().getSelectedItem();
			if (!oSelectedItem) {
				return;
			}
			var sLocationId = oSelectedItem.getKey();
			this.getNewBuildingSet(sLocationId);
		},
		getNewBuildingSet: function (sLocationId) {
			var aFilters = [
				new sap.ui.model.Filter(
					"LocationId",
					sap.ui.model.FilterOperator.EQ,
					sLocationId
				)
			];
			this._loadODataLocBuilding(
				"/NewBuildingSet",
				aFilters,
				"newBuildingModel"
			);
		},
		_loadODataLocBuilding: function (sPath, aFilters, sModelName) {
			var oModel = this.getOwnerComponent().getModel();
			var oView = this.getView();
			oModel.read(sPath, {
				filters: aFilters || [],
				success: function (oData) {
					oView.setModel(
						new sap.ui.model.json.JSONModel(oData),
						sModelName
					);
				}.bind(this),
				error: function (oError) {
					console.error("Error loading " + sPath, oError);
				}
			});
		},

		_validateDependentFields: function () {
			var bValid = true;
			// Org Unit
			var oOrgUnit = this.byId("newOrgUnit");
			var aOrgUnits = "";
			// var aOrgUnits = this.getView().getModel("newOrgUnitModel") ? this.getView().getModel("newOrgUnitModel").getProperty("/results") || []
			if (this.getView().getModel("newOrgUnitModel")) {
				aOrgUnits = this.getView().getModel("newOrgUnitModel").getProperty("/results");
			} else {
				aOrgUnits = [];
			}
			if (aOrgUnits.length > 0 && !oOrgUnit.getSelectedKey()) {
				oOrgUnit.setValueState("Error");
				oOrgUnit.setValueStateText("Please select an Org Unit");
				bValid = false;
			}

			// Building
			var oBuilding = this.byId("newBuilding");
			var aBuildings = "";
			// var aBuildings = this.getView().getModel("newBuildingModel") ? this.getView().getModel("newBuildingModel").getProperty("/results") || []
			if (this.getView().getModel("newBuildingModel")) {
				aBuildings = this.getView().getModel("newBuildingModel").getProperty("/results");
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
		handleDateChangeMngActn: function (oEvent) {
			var oView = this.getView();
			this.oSelectedDateCopy = "";
			this.oSelectedDateCopy = structuredClone(oEvent.getSource().getDateValue());
			var sEmplId = oView.getModel("employeeModelId").getProperty("/EmplId")
			this.showHideModel();
			this._updateFragment();
			this.onEmployeeSelect(sEmplId);
		},
		onEmployeeSelection: function (oEvent) {

		},
		matrxMngrIdSelection: function (oEvent) {
			var oView = this.getView();
			var selMatrxMngrTxt = oEvent.getSource().getSelectedText().split("-")[0].trim();
			var selMatrxMngrId = oEvent.getSource().getSelectedText().split("-")[1].trim();
			oView.getModel("employeeModel").setProperty("/MatrxMngName", selMatrxMngrTxt);
			oView.getModel("employeeModel").setProperty("/MatrxMngId", selMatrxMngrId);
		},
		newRMItmSelected: function (oEvent) {
			var oView = this.getView();
			var selRMItmTxt = oEvent.getSource().getSelectedText().split("-")[0].trim();
			var selRMItmId = oEvent.getSource().getSelectedText().split("-")[1].trim();
			oView.getModel("employeeModel").setProperty("/MRItemId", selRMItmId);
		}

	});
});