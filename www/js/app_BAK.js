var app = {
    initialize: function() {
        this.bindEvents();
    },
   
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        
    },

    onDeviceReady: function() {
        app.receivedEvent('deviceready');
		ons.setDefaultDeviceBackButtonListener(function() {
            if (navigator.notification.confirm("Are you sure to close the app?", 
                function(index) {
                    if (index == 1) { // OK button
                        navigator.app.exitApp(); // Close the app
                    }
                }
            ));
        });

 
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        console.log('Received Event: ' + id);
    },
  
};


(function() {
    var app = angular.module('sensationApp', ['onsen.directives', 'ngTouch', 'ngSanitize']);

    app.config(['$httpProvider', function($httpProvider) {

        $httpProvider.defaults.headers.common['Cache-Control'] = 'no-cache';
        $httpProvider.defaults.cache = false;

    }]);
 
	  // Login: Login Controller  **********************************
	  // ***********************************************************
	app.controller('loginController', function($scope, $rootScope, $http, transformRequestAsFormPost) {

		$scope.fazerLogin = function(login, senha) {
			window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, gotFS, fail);
			
			if(checkLogin(login, senha)) {
				entrachecklists();
			}
		}
		
	   function gotFS(fileSystem) {
		   
		}

		function fail(evt) {
			alert(JSON.stringify(evt));
		}
	
		
		function entrachecklists() {
			$scope.MeuNavigator.pushPage('escolhechecklist.html', {secaoPai: {}, animation: 'slide'});	
		}
	

		function checkLogin(login, senha) {
			
			var urljson = 'http://chamagar.com/dashboard/juridico/loginJson.asp';
			$http({method: 'POST',
				   url: urljson,
				   transformRequest: transformRequestAsFormPost,
						data: {
							login: login,
							senha: senha
						}
					}).
			success(function(data, status, headers, config) {
				if (data.nome != '' ) {
					localStorage.setItem('login', login);
					localStorage.setItem('senha', senha);
					localStorage.setItem('nomeusuario', data.nome);
					entrachecklists();
					return true;
				}
				else {
					alert('usuário/senha incorretos'); 
					return false;
				}
			}).
			error(function(data, status, headers, config) {
				alert('erro no json ' +  data);
				return false;
			});	
		};
	});
	
	
	 
	  // EscolheChecklist Controller  **********************************
	  // ***********************************************************
	app.controller('EscolheChecklistController', function($scope, $rootScope, $http, $filter) {
		
		$scope.token = $rootScope.tokenGlobal
		var page = MeuNavigator.getCurrentPage();
		$scope.secaoPai = page.options.secaoPai;
		if ($rootScope.chkoffline == undefined) 
			$rootScope.chkoffline = true;
		
		if ($scope.secaoPai == undefined || $scope.secaoPai.codigo == undefined) {
			$scope.secaoPai =  {};
			$scope.secaoPai.codigo = '';
		}

		//var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);
		var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);
				
		$scope.classelista = function(tipo) {
			if (tipo == "secao")
				return 'item lista_amarela ng-scope list__item ons-list-item-inner list__item--chevron';
			else
				return 'item item ng-scope list__item ons-list-item-inner list__item--chevron';
		}

		$scope.checklists = [];
		
		function atualizaOffline () {
			$scope.checklists = [];
			db.transaction(function(tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_gui (token text, codigo text, descricao text, secaopai text, tipo text, conforme text, obs text, latitude text, longitude text)');
				tx.executeSql("Select * from checklist_gui cg where codigo not like '%.%'", [], function(tx, results) {
						for (var i=0; i < results.rows.length; i++){
							row = results.rows.item(i);
							var item = {"codigo":row.codigo,"descricao": row.descricao, "token": row.token, "importado": true}
							$scope.checklists.push(item);
						}
						
						atualizaOnline();
						
						$scope.$apply();
					}
				);
			});
		}
		
		function atualizaOnline() {
			var urljson = 'http://chamagar.com/dashboard/juridico/secoes.asp?acao=escolhechecklist&hora=' + Date.now();
			$http({method: 'GET', url: urljson}).
			success(function(data, status, headers, config) {
				for (var i=0; i < data.secoes.length; i++){
							var item = {"codigo":data.secoes[i].codigo,"descricao": data.secoes[i].descricao, "token": data.secoes[i].token, "importado": false}
							//var result = $.grep($scope.checklists, function(e){ return e.token == data.secoes[i].token; });
							
							var found = $filter('filter')($scope.checklists, {token: data.secoes[i].token}, true);

							if (found.length == 0)
								$scope.checklists.push(item);
							// so insere um registro novo se ele ja nao existe
				}
				$scope.$apply();

			}).
			error(function(data, status, headers, config) {
				alert('erro no json ' +  data);
			});	
		};
		
		atualizaOffline();
		
		
		$scope.entrasecoes = function(token, nome) {
			$rootScope.tokenGlobal = token;
			$scope.MeuNavigator.pushPage('secoes.html', {secaoPai: {}, nomechecklist: nome, animation: 'slide'});	
		}

		
		$scope.showDetail = function(index) {
			var secaoPai = $scope.secoes[index];
			var secaoAvo = $scope.secaoPai
			if (secaoPai.tipo == 'secao')
				$scope.MeuNavigator.pushPage('secoes.html', {secaoPai: secaoPai, secaoAvo: secaoAvo, animation: 'slide'});
			else
				$scope.MeuNavigator.pushPage('itens.html', {secaoPai: secaoPai, secaoAvo: secaoAvo, animation: 'slide'});
		}
			 
		$scope.VoltaTopo = function(index) {
			$scope.MeuNavigator.pushPage('secoes.html',{secaoPai: $rootScope.secaoPai, animation: 'slide'})
		}
		

		$scope.PaginaConfig = function() {
			$scope.MeuNavigator.pushPage('config.html',{secaoPai: $rootScope.secaoPai, animation: 'slide'})
		}
		

		$scope.importaChecklist = function(token, nome) {
			$rootScope.tokenGlobal = token;
			$scope.MeuNavigator.pushPage('importachecklist.html',{secaoPai: $rootScope.secaoPai, nomechecklist: nome, animation: 'slide'})
		}
		
		
	});
	
	
    // SECOES Controller ****************************************
	// **********************************************************
    app.controller('SecoesController', function($interval, $scope, $rootScope, $http, SecoesData) {
		$scope.token = $rootScope.tokenGlobal
		var page = MeuNavigator.getCurrentPage();
		$scope.secaoPai = page.options.secaoPai;
		if (page.options.nomechecklist != undefined)
			$rootScope.nomechecklist = page.options.nomechecklist;
		
		if ($rootScope.chkoffline == undefined) 
			$rootScope.chkoffline = true;
		
		if ($scope.secaoPai == undefined || $scope.secaoPai.codigo == undefined) {
			$scope.secaoPai =  {};
			$scope.secaoPai.codigo = '';
		}

		var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);
				
		$scope.classelista = function(tipo) {
			if (tipo == "secao")
				return 'item lista_amarela ng-scope list__item ons-list-item-inner list__item--chevron';
			else
				return 'item item ng-scope list__item ons-list-item-inner list__item--chevron';
		}
			
		$scope.tem_foto = function(codigo) {
			db.transaction(function(tx) {
				tx.executeSql("Select count(*) as quantasfotos from checklist_fotos where token=? and codigo=?", [$scope.token, $scope.secaoPai.codigo], function(tx, results) {
					if (results.rows.item(0).quantasfotos > 0)
						return true;
					else
						return false;
				});
			});
		}

		$scope.tem_obs = function(codigo) {
			db.transaction(function(tx) {
				tx.executeSql("Select obs from checklist_gui where token=? and codigo=?", [$scope.token, $scope.secaoPai.codigo], function(tx, results) {
					if (results.rows.item(0).obs != undefined && results.rows.item(0).obs != '')
						return true;
					else
						return false;
				});
			});
		}
		
		$scope.tem_gps = function(codigo) {
			db.transaction(function(tx) {
				tx.executeSql("Select latitude from checklist_gui where token=? and codigo=?", [$scope.token, $scope.secaoPai.codigo], function(tx, results) {
					if (results.rows.item(0).latitude != undefined && results.rows.item(0).latitude != '')
						return true;
					else
						return false;
				});
			});
		}
		

		$scope.items = [];
		
		$scope.coricone = function(conforme) {
					if (conforme == undefined || conforme == '')
						return 'black';
					else if (conforme == 'sim')
						return 'green';
					else if (conforme == 'nao')
						return 'red';		
					else if (conforme == 'nao se aplica')
						return 'blue';
		}
		
		$scope.icone = function(conforme) {
					if (conforme == undefined || conforme == '')
						return 'fa-question'; 
					else if (conforme == 'sim')
						return 'fa-check-square-o';
					else if (conforme == 'nao')
						return 'fa-warning';	
					else if (conforme == 'naoseaplica')
						return 'fa-minus';						
		}

		


		function atualizaoffline () {
			$scope.secoes = [];
			db.transaction(function(tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_gui (token text, codigo text, descricao text, secaopai text, tipo text, conforme text, obs text, latitude text, longitude text)');
				tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_fotos (token text, codigo text, nome text, obs text)');
				tx.executeSql("Select *, (select count(*) from checklist_fotos where codigo = cg.codigo) as qtd_fotos from checklist_gui cg where cg.token=? and cg.secaopai=?", [$scope.token, $scope.secaoPai.codigo], function(tx, results) {
						for (var i=0; i < results.rows.length; i++){
							row = results.rows.item(i);
							$scope.secoes.push(row);
						}
						$scope.$apply();
					}, function(a, b) {
						 alert(b.message);
					}
						
				);
			});
		}
		
		
		$scope.showDetail = function(index) {
			var secaoPai = $scope.secoes[index];
			var secaoAvo = $scope.secaoPai
			if (secaoPai.tipo == 'secao')
				$scope.MeuNavigator.pushPage('secoes.html', {secaoPai: secaoPai, secaoAvo: secaoAvo, animation: 'slide'});
			else {
				$rootScope.tevealteracaoitem = false;
				$scope.MeuNavigator.pushPage('itens.html', {secaoPai: secaoPai, secaoAvo: secaoAvo, animation: 'slide'});
			}
		}
			 
		$scope.VoltaTopo = function(index) {
			$scope.MeuNavigator.pushPage('secoes.html',{secaoPai: $rootScope.secaoPai, animation: 'slide'})
		}
		
		
		$scope.PaginaConfig = function() {
			$scope.MeuNavigator.pushPage('config.html',{secaoPai: $rootScope.secaoPai, animation: 'slide'})
		}
		

		atualizaoffline();	

    });

	// ImportaChecklist  Controller *********************************************************
	// *******************************************************************************
    app.controller('ImportaController', function($scope, $rootScope, $http, transformRequestAsFormPost ) {
		$scope.token = $rootScope.tokenGlobal
		var checklist_secoes = [];
		$scope.conta_atualizando = 0;
		var page = MeuNavigator.getCurrentPage();
		$scope.nomechecklist = page.options.nomechecklist;
		$scope.atualizando = false;
		$scope.total_itens = 0;

		var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);

		$scope.AtualizaBanco = function() {
			puxabanco();
		}
	
		$scope.VoltaTopo = function(index) {
			$scope.MeuNavigator.pushPage('secoes.html',{secaoPai: $rootScope.secaoPai, animation: 'slide'});

		}
		
		function puxabanco() {
			$scope.atualizando = true;
			var urljson = 'http://chamagar.com/dashboard/juridico/secoes.asp?token=' + $scope.token + '&pai=99999&hora=' + Date.now();
			$http({method: 'GET', url: urljson}).
			success(function(data, status, headers, config) {
				checklist_secoes = data.secoes;
				criabanco();
			}).
			error(function(data, status, headers, config) {
				alert('erro no json ' +  data);
				$scope.atualizando = false;
			});	
		};
		
		
		function criabanco() {
			//db = window.openDatabase({name: "my.db"});

			db.transaction(function(tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_gui (token text, codigo text, descricao text, secaopai text, tipo text, conforme text, obs text, latitude text, longitude text)');
				tx.executeSql("DELETE from checklist_gui where token = ?", [$rootScope.tokenGlobal], function(tx, resultado) {
					$scope.total_itens = checklist_secoes.length;
					var cont = 0;
					for (var i=0;i < checklist_secoes.length; i++) {
						var sql = "INSERT INTO checklist_gui (token, codigo, descricao, secaopai, tipo) VALUES ('"+$rootScope.tokenGlobal+"','"+checklist_secoes[i].codigo+"','"+checklist_secoes[i].descricao+"','"+checklist_secoes[i].secaopai+"','"+checklist_secoes[i].tipo+"')";
						tx.executeSql(sql,[], function(tx, res) {
							$scope.conta_atualizando = cont;
							cont++;
							if (cont == checklist_secoes.length - 1) {
								$scope.atualizando = false;
								$scope.MeuNavigator.pushPage('escolhechecklist.html', {secaoPai: [], animation: 'slide'});	
							}
							$scope.$apply();
						}, function(dados) {
							console.log(JSON.stringify(dados));
						});
					}
				}, function(dados, erro) {
							console.log(JSON.stringify(erro.message));

					}
				);	
					
			});
		};
	});
	
	// CONFIG Controller *********************************************************
	// *******************************************************************************
    app.controller('ConfigController', function($scope, $rootScope, $http, transformRequestAsFormPost ) {
		$scope.token = $rootScope.tokenGlobal
		var checklist_secoes = [];
		$scope.conta_atualizando = 0;
		$scope.conta_atualizando_servidor = 0;
		$scope.conta_atualizando_fotos_servidor = 0;
		$scope.total_para_servidor = 0;
		$scope.total_fotos_para_servidor = 0;
		$scope.nomechecklist = $rootScope.nomechecklist;
		
	    var fs;
		window.requestFileSystem(PERSISTENT, 0, 
			function(fileSystem) {	fs = fileSystem	}
			, fail);
			
		var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);

		$scope.AtualizaBanco = function() {
			puxabanco();
		}

		$scope.VoltaTopo = function(index) {
			$scope.MeuNavigator.pushPage('secoes.html',{secaoPai: $rootScope.secaoPai, animation: 'slide'});

		}
		
		$scope.entraescolha = function(index) {
			$scope.MeuNavigator.pushPage('escolhechecklist.html',{secaoPai: '', animation: 'slide'})
		}
		
		$scope.apagachecklist = function(index) {
				var result = confirm('Confirma exlusão de todo o checklist, fotos e informações?');
				if (result ){
					db.transaction(function(tx) {
						tx.executeSql('DELETE FROM  checklist_gui WHERE token = ?',[$rootScope.tokenGlobal]);
						tx.executeSql('DELETE FROM  checklist_fotos WHERE token = ?',[$rootScope.tokenGlobal]);
					});
					$scope.MeuNavigator.pushPage('escolhechecklist.html',{secaoPai: '', animation: 'slide'});
				}

		}
		
		contaregistrosbanco();
		function contaregistrosbanco() {
			db.transaction(function(tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_gui (token text, codigo text, descricao text, secaopai text, tipo text, conforme text, obs text, latitude text, longitude text)');
				tx.executeSql("Select (Select count(*) from checklist_gui where token=cg.token  and tipo='item') as totalitens, (Select count(*) from checklist_gui where token=cg.token and tipo='item' and conforme is not null) as totalrespondidos, (Select count(*) from checklist_gui where token=cg.token  and tipo='item' and conforme='sim') as totalconforme, (Select count(*) from checklist_gui where token=cg.token  and tipo='item' and conforme='nao') as totalnaoconforme, (Select count(*) from checklist_gui where token=cg.token and tipo='item' and conforme='nao') as totalnaoconforme, (Select count(*) from checklist_gui where token=cg.token  and tipo='item' and conforme='nao se aplica') as totalnaoseaplica from checklist_gui cg where token=? and tipo='item' ", [$scope.token], function(tx, results) {
					$scope.totalitens = results.rows.item(0).totalitens;
					$scope.totalrespondidos = results.rows.item(0).totalrespondidos;
					$scope.totalconforme = results.rows.item(0).totalconforme;
					$scope.totalnaoconforme = results.rows.item(0).totalnaoconforme;
					$scope.totalnaoseaplica = results.rows.item(0).totalnaoseaplica;
					$scope.$apply();
				}
				);
			});
		};
		

		$scope.atualizaservidor = function() {
			//db = window.openDatabase({name: "my.db"});

			// atualiza dados itens
			db.transaction(function(tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_gui (token text, codigo text, descricao text, secaopai text, tipo text, conforme text, obs text, latitude text, longitude text)');
				tx.executeSql("select * from checklist_gui where (conforme is not null or obs is not null or latitude is not null)", [], function(tx, results) {
						$scope.total_para_servidor = results.rows.length;
						$scope.conta_atualizando_servidor = 0
						$scope.$apply();
						for (var i=0; i < results.rows.length; i++){
							row = results.rows.item(i);
							atualizaItemServidor($rootScope.tokenGlobal, row.codigo, row.conforme, row.obs, row.latitude, row.longitude);
						}
					}
				);
			});
		
			// atualiza fotos
			db.transaction(function(tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_fotos (token text, codigo text, nome text, obs text)');
				tx.executeSql("select * from checklist_fotos where token='" + $rootScope.tokenGlobal + "'", [], function(tx, results) {
						$scope.total_fotos_para_servidor = results.rows.length;
						$scope.conta_atualizando_fotos_servidor = 0
						$scope.$apply();
						for (var i=0; i < results.rows.length; i++){
							row = results.rows.item(i);
							var token = row.token;
							var codigo = row.codigo;
							var nome = row.nome;
							var obs = row.obs;
							var uri_arquivo = fs.root.nativeURL + nome
							uploadFoto(uri_arquivo, token, codigo, nome, obs );
							// pegando a foto para garantir que ela estara disponivel ao tentar o upload
							/* var root = fs.root;
							root.getFile(row.nome, {create: false}, gfSuccess, fail); 
							function gfSuccess(fileEntry) {
								var imageURI = fileEntry.toURL();
								uploadFoto(imageURI);
							}; */

						}
					}
				);
			});
		
		};
	

		
	function atualizaItemServidor(token, codigo, conforme, obs, latitude, longitude) {
		var urljson = 'http://chamagar.com/dashboard/juridico/atualizaItemServidor.asp';
		$http({method: 'POST',
			   url: urljson,
			   transformRequest: transformRequestAsFormPost,
					data: {
						token: token,
						codigo: codigo,
						conforme: conforme,
						obs: obs,
						latitude: latitude,
						longitude: longitude
					}
				}).
		success(function(data, status, headers, config) {
			//alert(JSON.stringify(data));
			$scope.conta_atualizando_servidor ++;
			//$scope.$apply();
		}).
		error(function(data, status, headers, config) {
			alert('erro no json ' +  data);
		});	
	};
	

	function uploadFoto(imageURI, token, codigo, nome, obs ) {
		var options = new FileUploadOptions();
		options.fileKey="file";
		options.fileName=imageURI.substr(imageURI.lastIndexOf('/')+1);
		options.mimeType="image/jpeg";

		var params = new Object();
		params.token = token;
		params.codigo = codigo;
		params.nome = nome;
		params.obs = obs;

		options.params = params;
		options.chunkedMode = false;

		var ft = new FileTransfer();
		ft.upload(imageURI, "http://chamagar.com/dashboard/juridico/uploadFoto.asp", win, fail, options);
	}

	function win(r) {
	/* 	alert("Code = " + r.responseCode);
		alert("Response = " + r.response);
		alert("Sent = " + r.bytesSent);
		alert(r.response); */
		$scope.conta_atualizando_fotos_servidor ++;
		$scope.$apply();		
	}

	function fail(error) {
		alert('erro: ' + JSON.stringify(error));
	}
		
	
	
	});	

	// ITENS Controller *********************************
	// **************************************************
    app.controller('ItensController', function($interval, $scope, $rootScope, $http) {
		$scope.token = $rootScope.tokenGlobal;
		var page = MeuNavigator.getCurrentPage();
		$scope.secaoPai = page.options.secaoPai;
		if (page.options.secaoAvo != undefined) {
			$rootScope.secaoAvo = page.options.secaoAvo;
		}
		$scope.txtobservacao = "";
		$scope.obtendo_gps = false;
		$scope.tevealteracao = false;
		
		var PERSISTENT
		if (typeof LocalFileSystem === 'undefined') {
			PERSISTENT = window.PERSISTENT;
		} else {
			PERSISTENT = LocalFileSystem.PERSISTENT ;
		}
		

		var fs;
		window.requestFileSystem(PERSISTENT, 0, 
			function(fileSystem) {
				fs = fileSystem
			}
			, deuerro);
	
		var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);
		
		$scope.fotos = [];
		ledados();
		function ledados() {
			$scope.fotos = [];
			db.transaction(function(tx) {
				tx.executeSql("Select * from checklist_gui where token=? and codigo=?", [$scope.token, $scope.secaoPai.codigo], function(tx, results) {
					$scope.txtobservacao = results.rows.item(0).obs;
					$scope.latitude = results.rows.item(0).latitude;
					$scope.longitude = results.rows.item(0).longitude;
					$scope.conformidade = results.rows.item(0).conforme;
					
					if ($scope.txtobservacao != undefined && $scope.txtobservacao != '')
						$scope.cor_icone_obs = "#1284ff";
					else
						$scope.cor_icone_obs = "#000000";
			
					tx.executeSql("Select * from checklist_fotos where token=? and codigo=?", [$scope.token, $scope.secaoPai.codigo], function(tx, results) {
						for (var i=0;i<results.rows.length;i++) {
							var fotoURL = fs.root.nativeURL + results.rows.item(i).nome;
							var foto = {url: fotoURL ,observacao: results.rows.item(i).obs};
							$scope.fotos.push(foto);
							$scope.$apply();
						};
					});	
					
					
					$scope.$apply();
				});
			});
		};
		

		// VERIFICA VALOR CONFORMIDADE
		$scope.verificavalor = function() {
			db.transaction(function(tx) {
				tx.executeSql("update checklist_gui set conforme=? where token=? and codigo=?", [$scope.conformidade, $rootScope.tokenGlobal, $scope.secaoPai.codigo], function(tx, res) {
					$rootScope.tevealteracaoitem = true;
					//alert('insert conformidade ok');
				});
			});
		};
		
		
		//ACAO
		$scope.acao = function(acao, param_url, param_observacao) { 
			if (acao == 'observacao') {
				if (param_url != '') {
					var url = param_url;
				}
				var observacao = param_observacao;
				$scope.MeuNavigator.pushPage('observacao.html', {secaoPai: $scope.secaoPai, url_foto: url, observacao: observacao, animation: 'slide'});	
			}
			else if (acao == 'fotos') {
				$scope.tirafoto(0);
			}
			else if (acao == 'gps') {
				$scope.registragps();
			}
			else if (acao == 'trocarfoto') {
				$scope.tirafoto(param_url);
			}
			else if (acao == 'apagarfoto') {
				var result = confirm("Confirma deleção?");
				if (result) {
					$scope.apagafoto(param_url);
				}
			}
			else
				alert(acao);
		}

		 
		 
		$scope.VoltaTopo = function(index) {
			$scope.MeuNavigator.pushPage('secoes.html',{secaoPai: $rootScope.secaoPai, animation: 'slide'});
		}		

		$scope.VoltaSecoes = function() {
			if ($rootScope.tevealteracaoitem) {
				$scope.MeuNavigator.popPage({onTransitionEnd : function() {
					$scope.MeuNavigator.replacePage('secoes.html', {secaoPai: $rootScope.secaoAvo, animation : 'none' } );
				}});	
			}
			else {
				$scope.MeuNavigator.popPage();
			}
		}
		
		// COR ICONE GPS
		$scope.cor_icone_gps = function() {
			//if (localStorage.getItem(chave_latitude) != undefined)
			if ($scope.latitude != undefined && $scope.latitude != '')
				return "#1284ff";
			else
				return "#000000";
		};
		
	
		// COR ICONE FOTO
		$scope.cor_icone_foto = function() {
			if ($scope.fotos.length > 0)
				return "#1284ff";
			else
				return "#000000";
		};	
		

		// REGISTRA GPS
		$scope.registragps = function() {
			var leugps = function(position) {
				alert('Latitude: '          + position.coords.latitude          + '\n' +
					  'Longitude: '         + position.coords.longitude         + '\n' +
					  'Altitude: '          + position.coords.altitude          + '\n' +
					  'Accuracy: '          + position.coords.accuracy          + '\n' +
					  'Altitude Accuracy: ' + position.coords.altitudeAccuracy  + '\n' +
					  'Heading: '           + position.coords.heading           + '\n' +
					  'Speed: '             + position.coords.speed             + '\n' +
					  'Timestamp: '         + position.timestamp                + '\n');

				$scope.latitude = position.coords.latitude;
				$scope.longitude = position.coords.longitude;
				$scope.obtendo_gps = false;
				$scope.$apply();
				
				db.transaction(function(tx) {
				tx.executeSql("update checklist_gui set latitude=?, longitude=? where token=? and codigo=?", [position.coords.latitude, position.coords.longitude, $rootScope.tokenGlobal, $scope.secaoPai.codigo], function(tx, res) {
					$rootScope.tevealteracaoitem = true;
				});
				
			});
				
			}	
			$scope.obtendo_gps = true;
			$scope.$apply();	
			navigator.geolocation.getCurrentPosition(leugps, deuerro);
		};

		// TIRA FOTO
		var imageURI;
		var URL_foto;
		$scope.tirafoto =  function(url) {
			URL_foto = url;
			navigator.camera.getPicture(tiroufoto, deuerro,
			  {
				quality: 50,
				destinationType: Camera.DestinationType.FILE_URI,
				encodingType: Camera.EncodingType.JPEG,
				targetWidth: 1024,
				correctOrientation: true

			});
		} 
		
		var tiroufoto = function( imgURI ) {
			imageURI = imgURI;
			// resolve file system for image
			window.resolveLocalFileSystemURL(imageURI, gotFileEntry, deuerro);
		}
			
		
		// MOVE A FOTO PARA O DIRETORIO PERMANENTE		
		function gotFileEntry(fileEntry) {
			fileEntry.moveTo(fs.root, fileEntry.name , fsSuccess, deuerro);
		}

		var fsSuccess = function(arquivo) {
			if (URL_foto != '') {
				var nome_foto = URL_foto.split('/').pop();
				// APAGA FOTO ANTIGA E ATUALIZA O BANCO POIS ESTA TROCANDO A FOTO
				fs.root.getFile(nome_foto, {create: false}, apagafoto_gui , null); 
				
				function apagafoto_gui(filee) {
					filee.remove(apagasucesso, deuerro);
				}
				
				function apagasucesso() {
					//alert('apaguei a foto');
				}
				
				db.transaction(function(tx) {
					tx.executeSql("update checklist_fotos set nome =? where token=? and codigo=? and nome=?", [arquivo.name, $rootScope.tokenGlobal, $scope.secaoPai.codigo, nome_foto], function(tx, res) {
						$rootScope.tevealteracaoitem = true;
						ledados();
					});
				});
			}
			else {
				db.transaction(function(tx) {
					tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_fotos (token text, codigo text, nome text, obs text)');
					tx.executeSql("INSERT INTO checklist_fotos (token, codigo, nome) VALUES (?,?,?)", [$rootScope.tokenGlobal, $scope.secaoPai.codigo, arquivo.name], function(tx, res) {
						$rootScope.tevealteracaoitem = true;
						ledados();
					});
				});
			}
			console.log("gravou " + arquivo.name + " - " + arquivo.fullPath);
		}
		
		var deuerro = function(error) {
			alert("Erro código: " + error.code);
			$scope.obtendo_gps = false;
			$scope.$apply();	
		};	

		// APAGA FOTO
		$scope.apagafoto = function(urlfoto) {
			var nomearquivo = urlfoto.split('/').pop();
			var root = fs.root;
			root.getFile(nomearquivo, {create: false}, apagafoto_acao, null); 
			db.transaction(function(tx) {
					tx.executeSql("DELETE from checklist_fotos where token=? and codigo=? and nome=?", [$rootScope.tokenGlobal, $scope.secaoPai.codigo, nomearquivo], function(tx, res) {
						$rootScope.tevealteracaoitem = true;
						ledados();
					});
			});			
		}
		
		// APAGA FOTO_ACAO
		function apagafoto_acao(fileEntry) {
			fileEntry.remove(null, null);
		}

		
    });

	
	// OBSERVACAO Controller *********************************************************
	// *******************************************************************************
    app.controller('ObservacaoController', function($interval, $scope, $rootScope, $http) {
		$scope.token = $rootScope.tokenGlobal
		var page = MeuNavigator.getCurrentPage();
		$scope.secaoPai = page.options.secaoPai;
		$scope.url_foto = page.options.url_foto;
		$scope.observacao = page.options.observacao;
		
		
		var recognizing;
		var recognition = new SpeechRecognition();
		recognition.continuous = false;
		recognition.maxAlternatives = 1;
		recognition.lang = 'pt-BR'
		reset();
		recognition.onend = reset;

		recognition.onresult = function (event) {
			var result = event.results[0][0].transcript;
			if ($scope.observacao == '' || $scope.observacao == undefined)
				$scope.observacao = result;
			else 
				$scope.observacao = $scope.observacao + ' ' + result;
			$scope.$apply();
		}

		function reset() {
		  recognizing = false;
		  $scope.ouvindo = false;
		}

		$scope.toggleStartStop = function() {
		  if (recognizing) {
			recognition.stop();
			reset();
		  } else {
			recognition.start();
			recognizing = true;
			$scope.ouvindo = true;
		  }
		}
		
	
		$scope.recognizeSpeech = function () {
			var maxMatches = 1;
			var promptString = "Comece a falar, para terminar clique no botão vermelho ou fique em silêncio."; // optional
			var language = "pt-BR";                     // optional
			window.plugins.speechrecognizer.startRecognize(function(result){
				if ($scope.observacao == '' || $scope.observacao == undefined)
						$scope.observacao = result;
				else 
					$scope.observacao = $scope.observacao + ' ' + result;
				$scope.$apply();
			}, function(errorMessage){
				console.log("Erro no reconhecimento de voz, por favor, tente novamente: " + errorMessage);
			}, maxMatches, promptString, language);
		}

	
		// Show the list of the supported languages
		$scope.getSupportedLanguages =  function () {
			window.plugins.speechrecognizer.getSupportedLanguages(function(languages){
				// display the json array
				alert(languages);
			}, function(error){
				alert("Could not retrieve the supported languages : " + error);
			});
		}
			
	var nome_foto = '';
	
	var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);

	$scope.gravaobservacao = function() {
		if ($scope.url_foto == undefined) {
			// observacao geral do item
			db.transaction(function(tx) {
				tx.executeSql("update checklist_gui set obs=? where token=? and codigo=?", [$scope.observacao, $rootScope.tokenGlobal, $scope.secaoPai.codigo], function(tx, res) {
					$rootScope.tevealteracaoitem = true;
				});
			
			});
		}
		else {
			// observacao da foto
			nome_foto = $scope.url_foto.split('/').pop();
			db.transaction(function(tx) {
				tx.executeSql("update checklist_fotos set obs=? where token=? and codigo=? and nome=?", [$scope.observacao, $rootScope.tokenGlobal, $scope.secaoPai.codigo, nome_foto], function(tx, res) {
					$rootScope.tevealteracaoitem = true;
				});
			});
		}
		
		//$scope.MeuNavigator.replacePage('itens.html', {secaoPai: $scope.secaoPai, animation : 'none' } );

		$scope.MeuNavigator.popPage({onTransitionEnd : function() {
			$scope.MeuNavigator.replacePage('itens.html', {secaoPai: $scope.secaoPai, animation : 'none' } );
		}
		});
	}
	 
	$scope.VoltaTopo = function(index) {
		$scope.MeuNavigator.pushPage('secoes.html',{secaoPai: $rootScope.secaoPai, animation: 'slide'});
	}
	
    });


	
app.factory('SecoesData', function()
{ 
    var data = {
	"codigo": "18",
	"descricao": "NR 18 SEG NAS CONSTRUCOES",
	"pai": "" };

    return data;
});
	
app.factory('AboutData', function()
{ 
    var data = []
    return data;
});


app.factory("transformRequestAsFormPost", function() {
		// I prepare the request data for the form post.
		function transformRequest( data, getHeaders ) {
			var headers = getHeaders();
			headers[ "Content-type" ] = "application/x-www-form-urlencoded; charset=utf-8";
			return( serializeData( data ) );
		}
		// Return the factory value.
		return( transformRequest );
		// ---
		// PRVIATE METHODS.
		// ---
		// I serialize the given Object into a key-value pair string. This
		// method expects an object and will default to the toString() method.
		// --
		// NOTE: This is an atered version of the jQuery.param() method which
		// will serialize a data collection for Form posting.
		// --
		// https://github.com/jquery/jquery/blob/master/src/serialize.js#L45
		function serializeData( data ) {
			// If this is not an object, defer to native stringification.
			if ( ! angular.isObject( data ) ) {
				return( ( data == null ) ? "" : data.toString() );
			}
			var buffer = [];
			// Serialize each key in the object.
			for ( var name in data ) {
				if ( ! data.hasOwnProperty( name ) ) {
					continue;
				}
				var value = data[ name ];
				buffer.push(
					encodeURIComponent( name ) +
					"=" +
					encodeURIComponent( ( value == null ) ? "" : value )
				);
			}
			// Serialize the buffer and clean it up for transportation.
			var source = buffer
				.join( "&" )
				.replace( /%20/g, "+" )
			;
			return( source );
		}
	}
);

		


})();