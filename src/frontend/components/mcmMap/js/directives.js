(function () { // This prevents problems when concatenating scripts that aren't strict.
'use strict';

angular.module('mcmMapDirectives', ['Config'])
	.directive('mcmMap', ['$timeout', '$rootScope', 'ConfigMap', '$compile', 'McmMapSchemaService', 'KnalledgeMapService',
		function($timeout, $rootScope, ConfigMap, $compile, McmMapSchemaService, KnalledgeMapService){


		// http://docs.angularjs.org/guide/directive
		// console.log("[mcmMap] loading directive");
		return {
			restrict: 'EA',
			scope: {
			},
			// ng-if directive: http://docs.angularjs.org/api/ng.directive:ngIf
			// expression: http://docs.angularjs.org/guide/expression
			templateUrl: '../components/mcmMap/partials/mcmMap.tpl.html',
			controller: function ( $scope, $element) {
				var toolEntityClicked = null;
				var mapEntityClicked = null;
				var inMapEntityDraggedIn = false;

				var mcmMapClientInterface = {
					getContainer: function(){
						return $element.find('.map-container');
					},
					mapEntityClicked: function(mapEntity /*, mapEntityDom*/){
						$scope.$apply(function () {
							mapEntityClicked = mapEntity;
							var eventName = "mapEntitySelectedEvent";
							$rootScope.$broadcast(eventName, mapEntity);
						});
					},
					mapEntityDraggedIn: function(mapEntity, decoratingEntity){
						// we need this to avoid double calling
						// the first on dragging in and second on clicking on the tool entity
						inMapEntityDraggedIn = true;
						$scope.$apply(function () {
							toolEntityClicked = null;

							console.log("Adding entity");
							var directiveScope = $scope.$new(); // $new is not super necessary
							// create popup directive
							var directiveLink = $compile("<div mcm_map_select_sub_entity class='mcm_map_select_sub_entity'></div>");
							// link HTML containing the directive
							var directiveElement = directiveLink(directiveScope);
							$element.append(directiveElement);

							directiveScope.map = mcmMap;
							directiveScope.entityRoot = mapEntity;
							directiveScope.entityDecorating = decoratingEntity;
							directiveScope.addigCanceled = function(){
								inMapEntityDraggedIn = false;
							},
							directiveScope.addedEntity = function(addingInEntity){
								console.log("Added entity to addingInEntity: %s", JSON.stringify(addingInEntity));

								addingInEntity.draggedInNo++;
								var relationship = {
									"name": "",
								};
								var entity = {
								};

								if(decoratingEntity.type == 'variable'){
									entity.name = "variable";
									entity.type = "variable";
									relationship.type = mcm.Map.CONTAINS_VARIABLE_OUT;
								}
								if(decoratingEntity.type == 'assumption'){
									entity.name = "assumption";
									entity.type = "assumption";
									relationship.type = mcm.Map.CONTAINS_ASSUMPTION_OUT;
								}

								mcmMap.addChildNode(addingInEntity, entity, relationship);

								// var updated = function(nodeFromServer){
								// 	console.log("[knalledgeMap::kMapClientInterface::addImage::addedImage::created'] createNode: " + nodeFromServer);
								// 	if(callback){callback(nodeFromServer);}
								// 	knalledgeMap.update(node);
								// };
								// KnalledgeNodeService.update(node).$promise
								// 	.then(updated);
							}.bind(this);
						});
					},
					timeout: $timeout
				};

				// initiating loading map data from server
				var mapProperties = {
					name: "Anna's Model",
					date: "2015.03.22.",
					authors: "Anna Kelbert",
					mapId: "ec2bf9409b8b80284c2e72c8",
					rootNodeId: "5532f5fb98b4e4789002d290"
				};

				KnalledgeMapService.loadData(mapProperties);

				var schema = {
					entityStyles: McmMapSchemaService.getEntitiesStyles()
				};

				var model = null;
				var mcmMap = new mcm.Map(d3.select($element.find(".map-container").get(0)),
					ConfigMap, mcmMapClientInterface, schema, KnalledgeMapService);

				var eventName = "modelLoadedEvent";
				$scope.$on(eventName, function(e, eventModel) {
					console.log("[mcmMap.controller::$on] ModelMap  nodes(len: %d): %s",
						eventModel.map.nodes.length, JSON.stringify(eventModel.map.nodes));
					console.log("[mcmMap.controller::$on] ModelMap  edges(len: %d): %s",
						eventModel.map.edges.length, JSON.stringify(eventModel.map.edges));

					mcmMap.init(function(){
						mcmMap.processData(eventModel);
						model = eventModel;
					});
				});

				eventName = "mapToolEntityClickedEvent";
				$scope.$on(eventName, function(e, toolEntity) {
					toolEntityClicked = toolEntity;
					if(mapEntityClicked && toolEntityClicked && !inMapEntityDraggedIn){
						mcmMapClientInterface.mapEntityDraggedIn(mapEntityClicked, toolEntityClicked);
					}
				});
			}
    	};
	}])
	.directive('mcmMapSelectSubEntity', ['McmMapSchemaService', 'KnalledgeMapService', function(McmMapSchemaService, KnalledgeMapService){ // mcm_map_select_sub_entity
		return {
			restrict: 'AE',
			// scope: {
			// },
			// ng-if directive: http://docs.angularjs.org/api/ng.directive:ngIf
			// expression: http://docs.angularjs.org/guide/expression
			templateUrl: '../components/mcmMap/partials/mcmMap-selectSubEntity.tpl.html',
			controller: function ( $scope, $element) {
				var kNodesById = [];
				var kEdgesById = [];

				var checkIfNodeOrSubchildrenAreSelectable = function(kNode, entityDecorating){
					// check if node itself is selectable
					var nodeSelectable;
					// returns a list of entities that entity type accept
					var allowedSubEntities = McmMapSchemaService.getAllowedSubEntities(kNode.type);
					if(allowedSubEntities[entityDecorating.type]){
						nodeSelectable = true;
					}else{
						nodeSelectable = false;
					}

					// build subree structure from children and check if any of subchildren is possible to decorate with entityDecorating
					var selectableInChildren = false;
					var edgeTypes = KnalledgeMapService.getChildrenEdgeTypes(kNode);
					for(var edgeType in edgeTypes){

						// iterate through children (of one edgeType and recirsively call buildSubTree and 
						//	check if any of children or subchildren is possible to drop in the entityDecorating)
						var kChildren = KnalledgeMapService.getChildrenNodes(kNode, edgeType);
						var selectableInSubTypeChildren = false;
						for(var childId in kChildren){
							var selectableInChild = checkIfNodeOrSubchildrenAreSelectable(kChildren[childId], entityDecorating);
							selectableInSubTypeChildren = selectableInSubTypeChildren || selectableInChild;
						}
						selectableInChildren = selectableInChildren || selectableInSubTypeChildren;
					}
					nodeSelectable = nodeSelectable || selectableInChildren;

					// if parent or any of children is possible to decorate with the entityDecorating
					return nodeSelectable;
				};
				var buildTree = function(entityRoot, entityDecorating, kNodesById, kEdgesById){
					var buildSubTree = function(parentKNode, kNode, entityDecorating, subTree, kNodesById, kEdgesById){
						if(!("children" in subTree)) subTree.children = [];
						if(!('visual' in kNode)) kNode.visual = {};
						kNode.visual.isOpen = true;

						var selectable = checkIfNodeOrSubchildrenAreSelectable(kNode, entityDecorating);
						if(selectable){
							// this node will be added after we get confirmation of any possibility to add it
							// (either it is possible to drop entityDecorating on, or any of its children)

							subTree.children.push(kNode);
							kNodesById.push(kNode);

							// creating edge between parent and child and adding it to list of edges
							if(parentKNode){
								var kEdge = new knalledge.KEdge();
								kEdge.name = "";
								kEdge.sourceId = parentKNode._id;
								kEdge.targetId = kNode._id;

								kEdgesById.push(kEdge);
							}
						}

						// build subree structure from children and check if any of subchildren is possible to decorate with entityDecorating
						var selectableInChildren = false;
						var edgeTypes = KnalledgeMapService.getChildrenEdgeTypes(kNode);
						for(var edgeType in edgeTypes){

							// iterate through children (of one edgeType and recirsively call buildSubTree and 
							//	check if any of children or subchildren is possible to drop in the entityDecorating)
							var kChildren = KnalledgeMapService.getChildrenNodes(kNode, edgeType);
							var selectableInSubTypeChildren = false;
							for(var childId in kChildren){
								var selectableInChild = checkIfNodeOrSubchildrenAreSelectable(kNode, entityDecorating);
								selectableInSubTypeChildren = selectableInSubTypeChildren || selectableInChild;
							}

							if(selectableInSubTypeChildren){
								if(!("children" in kNode)) kNode.children = [];

								// node that represents group of subentities (var-in, var-out, ...)
								var subTypeKNode = new knalledge.KNode();
								subTypeKNode.name = McmMapSchemaService.getEdgeDesc(edgeType).predicates;
								subTypeKNode.visual = {
									isOpen: true
								}
								
								// adding subtype node into parent ...
								kNode.children.push(subTypeKNode);
								// ... and list of all nodes
								kNodesById.push(subTypeKNode);

								// creating edge between parent node and subtype node and adding it to the list of all edges
								var kEdge = new knalledge.KEdge();
								kEdge.name = "";
								kEdge.sourceId = kNode._id;
								kEdge.targetId = subTypeKNode._id;

								kEdgesById.push(kEdge);

								// call each child in subtype to fill in subtree with itself and subchildren
								for(var childId in kChildren){
									buildSubTree(subTypeKNode, kChildren[childId], entityDecorating, subTypeKNode, kNodesById, kEdgesById);
								}
							}
						}
					};

					var treeHolder = {
						children: []
					};
					var tree = null;

					buildSubTree(null, entityRoot.kNode, entityDecorating, treeHolder, kNodesById, kEdgesById);
					if(treeHolder.children.length > 0){
						tree = treeHolder.children[0];
					}
					return tree;
				};

				var vkMap = buildTree($scope.entityRoot, $scope.entityDecorating, kNodesById, kEdgesById);

				$scope.mapConfigForInjecting = {
					tree: {
						viewspec: "viewspec_tree", // "viewspec_tree" // "viewspec_manual"
						fixedDepth: {
							enabled: false,
							levelDepth: 150
						},
						sizing: {
							setNodeSize: false,
							nodeSize: [400, 200]
						},
						margin: {
							top: 10,
							left: 20,
							right: 100,
							bottom: 10
						},
						mapService: {
							enabled: false
						}
					},
					nodes: {
						html: {
							dimensions: {
								sizes: {
									width: 100
								}
							}
						},
					},
					keyboardInteraction: {
						enabled: false
					},
					draggingConfig: {
						enabled: false
					}
				};

				var properties = {
					name: "Selectable tree of subentities",
					date: "",
					authors: "MCM Model",
					mapId: "",
					rootNodeId: vkMap._id
				};
				$scope.mapDataForInjecting = {
					vkMap: vkMap,
					map: {
						properties: properties,
						nodes: kNodesById,
						edges: kEdgesById
					},
					selectedNode: vkMap // the root node in the tree
				};

				$scope.title = "Select decoration entity";
				$scope.path = "Name";

				$scope.cancelled = function(){
					//console.log("Canceled");
					$element.remove();
					$scope.addigCanceled();
				};

				$scope.submitted = function(){
					console.log("Submitted");
					$scope.addedEntity($scope.selectedNode.ref);
					$element.remove();
				};
    		}
    	};
	}])
	.directive('mcmMapTools', ["$rootScope", "$timeout", 'ConfigMapToolset', 'McmMapSchemaService', 
		function($rootScope, $timeout, ConfigMapToolset, McmMapSchemaService){
		console.log("[mcmMapTools] loading directive");
		return {
			restrict: 'AE',
			scope: {
			},
			// ng-if directive: http://docs.angularjs.org/api/ng.directive:ngIf
			// expression: http://docs.angularjs.org/guide/expression
			templateUrl: '../components/mcmMap/partials/mcmMap-tools.tpl.html',
			controller: function ( $scope, $element) {
				var clickedToolEntity = null;
				var toolsetClientInterface = {
					getContainer: function(){
						return $element.find('ul');
					},
					getData: function(){
						return $scope.tools;
					},
					toolEntityClicked: function(toolEntity){
						if(clickedToolEntity == toolEntity){
							clickedToolEntity = null;
						}else{
							clickedToolEntity = toolEntity;
						}
						var eventName = "mapToolEntityClickedEvent";
						$rootScope.$broadcast(eventName, clickedToolEntity);

					},
					timeout: $timeout
				};

				$scope.tools = [];
				$scope.tools.length = 0;
				var entities = McmMapSchemaService.getAllowedSubEntities('unselected');
				for(var entityName in entities){
					$scope.tools.push(McmMapSchemaService.getEntityDesc(entityName));
				}

				var toolset = new mcm.EntitiesToolset(ConfigMapToolset, toolsetClientInterface);
				toolset.init();

				var eventName = "mapEntitySelectedEvent";

				$scope.$on(eventName, function(e, mapEntity) {
					if(mapEntity){
						console.log("[mcmMapTools.controller::$on] ModelMap  mapEntity (%s): %s", mapEntity.kNode.type, mapEntity.kNode.name);
					}
					$scope.tools.length = 0;
					var entities = McmMapSchemaService.getAllowedSubEntities(mapEntity ? mapEntity.kNode.type : "unselected");
					for(var entityName in entities){
						$scope.tools.push(McmMapSchemaService.getEntityDesc(entityName));
					}
					toolset.update();
				});
    		}
    	};
	}])
	.directive('mcmMapList', ['KnalledgeMapService', function(KnalledgeMapService){
		// http://docs.angularjs.org/guide/directive
		return {
			restrict: 'AE',
			scope: {
			},
			// ng-if directive: http://docs.angularjs.org/api/ng.directive:ngIf
			// expression: http://docs.angularjs.org/guide/expression
			templateUrl: '../components/mcmMap/partials/mcmMap-list.tpl.html',
			controller: function ( $scope ) {
				var mcmMapModel = null;
				var mcmMap = null;

				var eventName = "mapEntitySelectedEvent";
				$scope.$on(eventName, function(e, mapEntity) {
					if(mapEntity){
						console.log("[mcmMapList.controller::$on] ModelMap  mapEntity (%s): %s", mapEntity.kNode.type, mapEntity.kNode.name);
						//KnalledgeMapService
					}
				});

				var eventName = "modelLoadedEvent";
				$scope.$on(eventName, function(e, eventModel) {
					console.log("[mcmMapTools.controller::$on] ModelMap  nodes(len: %d): %s",
						eventModel.map.nodes.length, JSON.stringify(eventModel.map.nodes));
					console.log("[mcmMapTools.controller::$on] ModelMap  edges(len: %d): %s",
						eventModel.map.edges.length, JSON.stringify(eventModel.map.edges));
					mcmMapModel = eventModel.map;

					mcmMap = new mcm.list.Map(d3.select($element.find(".map-container").get(0)),
						ConfigMap, mcmMapClientInterface, schema, KnalledgeMapService);

					var eventName = "modelLoadedEvent";
					$scope.$on(eventName, function(e, eventModel) {
						console.log("[mcmMap.controller::$on] ModelMap  nodes(len: %d): %s",
							eventModel.map.nodes.length, JSON.stringify(eventModel.map.nodes));
						console.log("[mcmMap.controller::$on] ModelMap  edges(len: %d): %s",
							eventModel.map.edges.length, JSON.stringify(eventModel.map.edges));

						mcmMap.init(function(){
							mcmMap.processData(eventModel);
							model = eventModel;
						});
					});
				});
    		}	
    	};
	}])
	.directive('mcmMapNode', [function(){
		// http://docs.angularjs.org/guide/directive
		return {
			restrict: 'E',
			scope: {
				'sale': '='
				,'isLast': '='
				// default options
				// 	https://github.com/angular/angular.js/issues/3804
				//	http://stackoverflow.com/questions/18784520/angular-directive-with-default-options
				//	https://groups.google.com/forum/#!topic/angular/Wmzp6OU4IRc
				,'readonly': '='
			},
			// ng-if directive: http://docs.angularjs.org/api/ng.directive:ngIf
			// expression: http://docs.angularjs.org/guide/expression
			templateUrl: 'modules/mcmMap/partials/sale-show.tpl.html',
			controller: function ( $scope ) {
				console.log($scope);
    		}
		};
	}])
	.directive('mcmMapEdge', [function(){
		// http://docs.angularjs.org/guide/directive
		return {
			restrict: 'E',
			scope: {
				'sale': '='
				,'isLast': '='
				// default options
				// 	https://github.com/angular/angular.js/issues/3804
				//	http://stackoverflow.com/questions/18784520/angular-directive-with-default-options
				//	https://groups.google.com/forum/#!topic/angular/Wmzp6OU4IRc
				,'readonly': '='
			},
			// ng-if directive: http://docs.angularjs.org/api/ng.directive:ngIf
			// expression: http://docs.angularjs.org/guide/expression
			templateUrl: 'modules/mcmMap/partials/sale-show.tpl.html',
			controller: function ( $scope) {
				console.log($scope);
    		}
		};
	}])
;

}()); // end of 'use strict';