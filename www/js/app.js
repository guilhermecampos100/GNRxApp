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
	
 
	  // LOGIN: Login Controller  **********************************
	  // ***********************************************************
	app.controller('loginController', function($scope, $rootScope, $http, transformRequestAsFormPost) {

		// SE JA TEM GRAVADO UM LOGIN ENTAO ENTRA DIRETO
		if (localStorage.getItem('login') != undefined) {
				entrachecklists();
				return true;
		}
			
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
			$scope.nav.resetToPage('principal.html', {secaoPai: {}, animation: 'slide'});	
		}
	
 
		function checkLogin(login, senha) {
	
			var urljson = 'http://gnrx.com.br/loginJson.asp';
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
					localStorage.setItem('emailusuario',data.email);
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
				if (localStorage.getItem('login') != undefined) {
					entrachecklists();
					return true;
				}
				
				return false;
			});	
		};
	});

	  // EDITACHECKLIST Controller  **********************************
	  // ***********************************************************	
	app.controller('EditaChecklistController', function($scope, $rootScope) {
			
		var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);
		
		// LE DADOS

		function lerDados() {
			var sql = "select * from check_cab where token=?";		
			db.transaction(function(tx) {
				tx.executeSql(sql,[$rootScope.tokenGlobal], function(tx, result) {
					var row = result.rows.item(0)
					$scope.nome = row.nome
					$scope.local = row.local
					$scope.empresa = row.empresa
					$scope.num_funcionarios = row.num_funcionarios
					$scope.modelo = row.modelo
					$scope.datacriacao = row.datacriacao
					$scope.nomeusuario = localStorage.getItem('nomeusuario')
					$scope.$apply();
				});
			})
		}
		
		lerDados();
		
		// SALVAR EDICAO
		$scope.salvarEdicao = function() {
		var sql = "update check_cab set nome =? , local=?, empresa=?, num_funcionarios=? where token=? ";		
			db.transaction(function(tx) {
				tx.executeSql(sql,[$scope.nome, $scope.local, $scope.empresa, $scope.num_funcionarios, $rootScope.tokenGlobal]);
				MeuNavigator.popPage();
			});
		}
	
	})
	
	// CRIARNOVA Controller  **********************************
	  // ***********************************************************
	app.controller('CriarnovaController', function($scope, $rootScope, $http, $filter) {	
	

	$scope.criarchecklist = function () {
		puxabanco();
	}
	
	atualizaOnline();
	$scope.modelos = [];
	// VERIFICA OS CHECKLIST NO SERVIDOR DISPONIVEIS PARA DOWNLOAD
	
	function atualizaOnline() {
		var urljson = 'http://gnrx.com.br/exporta_modelo_json.asp?acao=escolhemodelo&hora=' + Date.now();
		$http({method: 'GET', url: urljson}).
		success(function(data, status, headers, config) {
			for (var i=0; i < data.secoes.length; i++){
						var item = {"codigo":data.secoes[i].codigo,"descricao": data.secoes[i].descricao, "token": data.secoes[i].token, "importado": false,  "datalimite": data.secoes[i].datalimite}
						$scope.modelos.push(item);
						$scope.temchecklistservidor = true;
			}
			$scope.$apply();

		}).
		error(function(data, status, headers, config) {
			alert('checar conexao internet ' +  status.message);
		});	
	}

	$scope.datacriacao = dataAtualFormatada()
	$scope.nomeusuario = localStorage.getItem('nomeusuario')
	
	// DATA ATUAL FORMATADA
	function dataAtualFormatada(){	
		var data = new Date();
		var dia = data.getDate();
		if (dia.toString().length == 1)
		  dia = "0"+dia;
		var mes = data.getMonth()+1;
		if (mes.toString().length == 1)
		  mes = "0"+mes;
		var ano = data.getFullYear();  
		return dia+"/"+mes+"/"+ano;
	}


// CONTEUDO DO IMPORTACHECKLIST CONTROLER

	$scope.token = $rootScope.tokenGlobal
	var checklist_secoes = [];
	var glossario = [];
	$scope.conta_atualizando = 0;
	//var page = MeuNavigator.getCurrentPage();
	//$scope.nomechecklist = page.options.nomechecklist;
	$scope.atualizando = false;
	$scope.total_itens = 0;
	
	var fs;
	window.requestFileSystem(PERSISTENT, 0, function(fileSystem) {
		fs = fileSystem;
		var directoryEntry = fs.root; // to get root path of directory
		directoryEntry.getDirectory('anexos', { create: true, exclusive: false }, onDirectorySuccess, onDirectoryFail); // creating folder in sdcard
	}
	, fail);
	
	function onDirectorySuccess(parent) {
		// Directory created successfuly
		//alert("diretorio criado: " + parent.name);
	}

	function onDirectoryFail(error) {
		//Error while creating directory
		alert("Unable to create new directory: " + error.code);
	}	

	var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);

	$scope.VoltaTopo = function(index) {
		$scope.MeuNavigator.pushPage('secoes.html',{secaoPai: $rootScope.secaoPai, animation: 'slide'});

	}
	
	// PUXA BANCO - SECOES E ITENS
	function puxabanco() {
		$scope.atualizando = true;
		var urljson = 'http://gnrx.com.br/exporta_modelo_json.asp?codigo=' + $scope.selectModelo + '&hora=' + Date.now();
		$http({method: 'GET', url: urljson}).
		success(function(data, status, headers, config) {
			checklist_secoes = data.secoes;
			criabanco();
		}).
		error(function(data, status, headers, config) {
			alert('erro no arquivo json (importando checklist)' +  status.message);
			$scope.atualizando = false;
		});	
	};
	
	// PUXA GLOSSARIO
	function puxaglossario() {
		$scope.atualizando = true;
		var urljson = 'http://gnrx.com.br/puxaglossario.asp?hora=' + Date.now();
		$http({method: 'GET', url: urljson}).
		success(function(data, status, headers, config) {
			glossario = data.glossario;
			criabancoGlossario();
		}).
		error(function(data, status, headers, config) {
			alert('erro no arquivo json (importando glossario)' +  status.message);
			$scope.atualizando = false;
		});	
	};

	function criabancoGlossario() {
		db.transaction(function(tx) {
			tx.executeSql('CREATE TABLE IF NOT EXISTS glossario (codigo int, termo text, descricao text)');
			$scope.total_itens_glossario = glossario.length;
			var cont = 0;
			for (var i=0;i < glossario.length; i++) {
				var entidade = glossario[i].entidade
				var sql = "INSERT INTO glossario (codigo, termo, descricao) VALUES ('"+glossario[i].codigo+"','"+glossario[i].termo+"','"+glossario[i].descricao+"')";
				tx.executeSql(sql,[], function(tx, res) {
					$scope.conta_atualizando_glossario = cont;
					cont++;
					if (cont == glossario.length - 1) {
						$scope.atualizandoglossario = false;
						alert('glossario atualizado ' + glossario.length + ' termos ');
						//$scope.MeuNavigator.pushPage('escolhechecklist.html', {secaoPai: [], animation: 'slide'});	
					}
					$scope.$apply();
				}, function(dados, erro) {
					console.log(JSON.stringify(erro.message));
				});
			}
		});	
	};

	
	function filetransfer(download_link, fp) {
		var fileTransfer = new FileTransfer();
		// File download function with URL and local path
		fileTransfer.download(download_link, fp,
				function (entry) {
					//alert("download complete: " + entry.fullPath);
				},
			 function (error) {
				 //Download abort errors or download failed errors
				// alert("download error source " + error.source);
			 }
		);
	}		

	// CRIA REGISTRO CABECALHO DO CHECKLIST
	function criabanco() {
		//db = window.openDatabase({name: "my.db"});
		db.transaction(function(tx) {
			tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_gui (token text, codigo text, descricao text, secaopai text, tipo text, conforme text, obs text, latitude text, longitude text,datalimite text, entidade int, ordenacao text, codigooriginal text, atualizouservidor int, imagemanexa text, hierarquia text, local text, infracao int, desabilitada int)');

			$scope.total_itens = checklist_secoes.length;
			var cont = 0;
			for (var i=0;i < checklist_secoes.length; i++) {
				if (checklist_secoes[i].anexo != undefined && checklist_secoes[i].anexo != '') {
					var File_Name = checklist_secoes[i].anexo;
					// IMPORTA ANEXOS: aqui tem que fazer o download da imagem e gravar no fs 
					var rootdir = fs.root;
					var fp = fs.root.nativeURL 
					fp = fp + "/anexo/" + File_Name;
					var download_link = 'http://gnrx.com.br/imagensanexas/' + File_Name;
					filetransfer(download_link, fp);
				}
				// em vez de inserir vazio, deve inserir null 
				var sql = "INSERT INTO checklist_gui (token, codigooriginal, descricao, secaopai, tipo, ordenacao,  codigo, atualizouservidor, imagemanexa, hierarquia, infracao) VALUES ('"+checklist_secoes[i].token+"','"+checklist_secoes[i].codigo+"','"+checklist_secoes[i].descricao+"','"+checklist_secoes[i].secaopai+"','"+checklist_secoes[i].tipo+"','"+checklist_secoes[i].ordenacao+"','" + checklist_secoes[i].codigo + "',1,'"+checklist_secoes[i].anexo+"','"+checklist_secoes[i].hierarquia+"',"+checklist_secoes[i].infracao+")";
				tx.executeSql(sql,[], function(tx, res) {
					$scope.conta_atualizando = cont + 3;
					cont++;
				
					if (cont == checklist_secoes.length - 1) {
						tx.executeSql('CREATE TABLE IF NOT EXISTS check_cab (token text, codigo text, nome text, modelo text, datacriacao text, local text, empresa text, num_funcionarios int)');	
						var sql = "INSERT INTO check_cab(token, codigo, nome, modelo, datacriacao, local, empresa, num_funcionarios) values(?,?,?,?,?,?,?,?)";
						tx.executeSql(sql,[checklist_secoes[1].token, $scope.selectModelo, $scope.nome, achaDescricaoModelo($scope.selectModelo), $scope.datacriacao, $scope.local, $scope.empresa, $scope.num_funcionarios]);
						alert('Criado novo checklist ' + $scope.nome + '(' + checklist_secoes[1].token + ')');
						
						$scope.atualizando = false;
						tabbar.loadPage("escolhechecklist.html")
						//$scope.MeuNavigator.pushPage('escolhechecklist.html', {secaoPai: [], animation: 'slide'});	
						
					}
					$scope.$apply();
				}, function(dados, erro) {
					console.log(JSON.stringify(erro.message));
					//alert(JSON.stringify(erro.message));
				});

			}
			
			

				
		});
	}
	
	function achaDescricaoModelo(codigo) {
		for (var i=0; i<$scope.modelos.length;  i++) {
			if ($scope.modelos[i].codigo == codigo) {
				return $scope.modelos[i].descricao;
			}
		}
	}
	
	function fail(error) {
		alert('erro: ' + JSON.stringify(error));
	}


});
	
	  // EscolheChecklist Controller  **********************************
	  // ***********************************************************
	app.controller('EscolheChecklistController', function($scope, $rootScope, $http, $filter) {
		
		
		tabbar.on('prechange', function(event) {	
			if ($rootScope.tokenGlobal == undefined && event.index != 0) {
				alert('Antes de entrar escolha uma inspeção')
				event.cancel();
				return
			}

		
			if (event.index == 2) {
				MeuNavigator.pushPage("itens.html")
				event.cancel();
				return;
			}
		});

	
		$scope.token = $rootScope.tokenGlobal
		var page = MeuNavigator.getCurrentPage();
		$scope.secaoPai = page.options.secaoPai;
		
		$scope.secaoPai = $rootScope.secaopai
		if ($rootScope.chkoffline == undefined) 
			$rootScope.chkoffline = true;
		
		if ($scope.secaoPai == undefined || $scope.secaoPai.codigo == undefined) {
			$scope.secaoPai =  {};
			$scope.secaoPai.codigo = '';
			$rootScope.secaopai = {};
		}

		
		$scope.temchecklistlocal = false;
		$scope.temchecklistservidor = false;
		
		$scope.refresca = function() {
			atualizaOffline();
		}
		
		//var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);
		var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);
				
		$scope.classelista = function(tipo) {
			if (tipo == "info")
				return 'item lista_azulclaro ng-scope list__item ons-list-item-inner list__item--chevron';			
			if (tipo == "secao")
				return 'item lista_amarela ng-scope list__item ons-list-item-inner list__item--chevron';
			if (tipo == "item")
				return 'item item ng-scope list__item ons-list-item-inner list__item--chevron';
		}

		$scope.checklists = [];
		
		atualizaOffline();
		// PREENCHE ENTIDADE CHECKLISTS COM OS JA BAIXADOS PARA O APP
		function atualizaOffline () {
			$scope.checklists = [];
			db.transaction(function(tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS check_cab (token text, codigo text, nome text, modelo text, datacriacao text, local text, empresa text, num_funcionarios int)');
				tx.executeSql('select * from check_cab', [], function(tx, results) {
						if (results.rows.length > 0) {$scope.temchecklistlocal = true; }
						for (var i=0; i < results.rows.length; i++){
							row = results.rows.item(i);
							var item = {"nome": row.nome,"modelo": row.modelo, "token": row.token, "importado": true, "datacriacao": row.datacriacao, "local": row.local, "empresa": row.empresa}
							$scope.checklists.push(item);
						}
						
						//atualizaOnline();
						
						$scope.$apply();
					}, function(a, b) {
						alert(b.message);
					}
				);
			});
		}
		
		
		// VERIFICA OS CHECKLIST NO SERVIDOR DISPONIVEIS PARA DOWNLOAD
		function atualizaOnline() {
			var urljson = 'http://gnrx.com.br/secoes.asp?acao=escolhechecklist&hora=' + Date.now();
			$http({method: 'GET', url: urljson}).
			success(function(data, status, headers, config) {
				for (var i=0; i < data.secoes.length; i++){
							var item = {"codigo":data.secoes[i].codigo,"descricao": data.secoes[i].descricao, "token": data.secoes[i].token, "importado": false,  "datalimite": data.secoes[i].datalimite}
							//var result = $.grep($scope.checklists, function(e){ return e.token == data.secoes[i].token; });
							
							var found = $filter('filter')($scope.checklists, {token: data.secoes[i].token}, true);
							if (found.length == 0) {
								$scope.checklists.push(item);
								$scope.temchecklistservidor = true;
							// so insere um registro novo se ele ainda nao foi baixado
							}
				}
				$scope.$apply();

			}).
			error(function(data, status, headers, config) {
				alert('checar conexao internet ' +  status.message);
			});	
		};
		
		// CRIAR NOVA
		$scope.criarnova = function(token, nome) {
			//tabbar.loadPage("criarnova.html")
			$scope.MeuNavigator.pushPage('criarnova.html', {secaoPai: {}, secaoAvo: {}, animation: 'slide'});	
		}
		
		// NAVEGA PARA SECOES
		$scope.entrasecoes = function(indice) {

			$rootScope.secaoPai = []
			$rootScope.secaoAvo = []
			$rootScope.busca = ''
			var estechecklist = $scope.checklists[indice];
			$rootScope.local = estechecklist.local;
			$rootScope.tokenGlobal = estechecklist.token;
			$rootScope.nomechecklist = estechecklist.nome;
			
			$scope.MeuNavigator.pushPage('secoes.html', {secaoPai: {}, secaoAvo: {}, checklist: estechecklist, animation: 'slide'});	
			//tabbar.loadPage('secoes.html');		
		}
	});
	
	// PERSONALIZA CHECKLIST Controller ****************************************
	// **********************************************************
	app.controller('PersonalizaChecklistController', ['$q', '$interval', '$timeout', '$location', '$anchorScroll', '$scope', '$compile', '$rootScope', '$http', 'SecoesData', function($q, $interval, $timeout, $location, $anchorScroll, $scope, $compile, $rootScope, $http, SecoesData) {
		$scope.token = $rootScope.tokenGlobal

		var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);
				
		$scope.secoes = [];
			
		atualizaoffline();	
		// CARREGA SECOES - ATUALIZA OFFLINE
		function atualizaoffline () {			
			$scope.secoes = [];
			db.transaction(function(tx) {
				var sql = ''
				sql = "select * from checklist_gui where token=? and ifnull(secaopai,'') = '' and codigo != '00' "
				// pega somente o primeiro nivel (secaopai vazio)
				tx.executeSql(sql, [$scope.token], function(tx, results) {
					row = results.rows.item(0)
					$scope.codigoNorma = row.codigo
					sql = "Select *, (select descricao from checklist_gui where codigo = cg.secaopai) as descricaoPai, (select count(*) from checklist_fotos where codigo = cg.codigo and token = cg.token and ifnull(entidade,0) = ifnull(cg.entidade,0)) as qtd_fotos, (select nome from checklist_fotos where codigo = cg.codigo and token = cg.token and ifnull(entidade,0) = ifnull(cg.entidade,0) limit 1) as fotosecao, (select count(*) from checklist_gui where token=cg.token and tipo='item' and hierarquia like cg.hierarquia || '*%' ) as totalitens, (select sum(case when conforme is not null then 1 else 0 end) totalrespondidos from checklist_gui where token = cg.token and tipo='item' and hierarquia like cg.hierarquia || '*%') as respondidos from checklist_gui cg where cg.token=? and cg.secaopai=? order by ordenacao, entidade"
					tx.executeSql(sql, [$scope.token, $scope.codigoNorma], function(tx, results) {
							for (var i=0; i < results.rows.length; i++){
								row = results.rows.item(i);
								row.descricaocomglossario = row.descricao.replace("<(glo", "<a id=linkglossario class=linkglo ng-click=showglossario($event,");
								row.desabilitadaaux = 1;
								$scope.secoes.push(row);
							}
							if (results.rows.length == 0) {
								$scope.nenhumItemEncontrado = true
							}
							$scope.$apply();
						}, function(a, b) {
							 alert(b.message);
						}		
					);
				});
			});
		}
	
		// CLASSE LISTA		
		$scope.classelista = function(index) {
			if ($scope.secoes[index].desabilitadaaux == 0)
				return 'item lista_amarela ng-scope list__item ons-list-item-inner list__item--chevron';
			else
				return 'item ng-scope list__item ons-list-item-inner list__item--chevron';
		}

		// INCLUI / EXCLUI SECAO
		$scope.incluiSecao = function(index) {
			var novasecoes = angular.copy($scope.secoes);
			if (novasecoes[index].desabilitadaaux == undefined || novasecoes[index].desabilitadaaux == 0) {
					novasecoes[index].desabilitadaaux = 1
			}
			else {
				novasecoes[index].desabilitadaaux = 0
			}
			$scope.secoes = [];
			$scope.secoes = novasecoes;
			$scope.$apply();
		};
		
		// CANCELA
		$scope.cancelarPersonalizacao = function() {
			MeuNavigator.popPage();
		}
		
		// SALVAR
		$scope.salvarPersonalizacao = function() {
			$scope.secoes.forEach(function logArrayElements(este, index, array) {
				db.transaction(function(tx) {
					tx.executeSql("update checklist_gui set desabilitada=? where token=? and codigo=?", [este.desabilitadaaux, $rootScope.tokenGlobal, este.codigo])
					var sql = "update checklist_gui set desabilitada = ? where token = ? and hierarquia like (select hierarquia from checklist_gui cg where token=? and codigo = ? limit 1) || '*%'"
					// desabilita os filhos da secao desabilitada
					tx.executeSql(sql, [este.desabilitadaaux, $rootScope.tokenGlobal, $rootScope.tokenGlobal, este.codigo])
				});
				$scope.VoltaTopo();
			});
		}
		
		// VOLTA AO TOPO
		$scope.VoltaTopo = function(index) {
			$rootScope.secaoPai = '';
			var pages = MeuNavigator.getPages();
			var quantas_paginas = pages.length
			for (var i=1; i < quantas_paginas; i++) {
				$scope.MeuNavigator.popPage({animation: 'none'})
			}
		}
		
	}]);
		
    // SECOES Controller ****************************************
	// **********************************************************
    app.controller('SecoesController', ['$q', '$interval', '$timeout', '$location', '$anchorScroll', '$scope', '$compile', '$rootScope', '$http', 'SecoesData', function($q, $interval, $timeout, $location, $anchorScroll, $scope, $compile, $rootScope, $http, SecoesData) {
		$scope.token = $rootScope.tokenGlobal
		var page = MeuNavigator.getCurrentPage();
		$scope.secaoPai = page.options.secaoPai;
		$scope.secaoAvo = page.options.secaoAvo;
		
		$scope.exibircodigonorma = $rootScope.exibircodigonorma;
		$scope.exibirnumerador = $rootScope.exibirnumerador;
		$scope.nenhumItemEncontrado = false
		

		$scope.buscar = function(index) {
			$rootScope.busca = $scope.busca
			atualizaoffline();
		}
		
		var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);
	
		// CANCELAR ASSOCIAR NORMA
		$scope.cancelarAssociar = function () {
			$rootScope.associarNorma = false;
			$scope.$apply();
		}
		
		// ESCOLHE NORMA (ASSOCIA ITEM AVULSO A NORMA)
		$scope.escolheNorma = function(indice) {

			var entidadeAssociar = 0
			if ($rootScope.entidadeAssociar != undefined) {
				entidadeAssociar = $rootScope.entidadeAssociar
			}
			
			var codigo_raiz = $scope.secoes[indice].codigooriginal;
			var secaopai = $scope.secoes[indice].secaopai
			var ordenacao = $scope.secoes[indice].ordenacao
			var codigooriginal = $scope.secoes[indice].codigooriginal
			var hierarquia = $scope.secoes[indice].hierarquia
			var infracao = $scope.secoes[indice].infracao
			var descricaoNR = $scope.secoes[indice].descricao 
			
			db.transaction(function(tx) {
				tx.executeSql("select max(ifnull(entidade,0)) as entidade from checklist_gui where token=? and codigooriginal = ? ", [$rootScope.tokenGlobal, codigo_raiz], function(tx, results) {
					var prox_entidade = results.rows.item(0).entidade + 1;
					var codigo_raiz_novo = codigo_raiz + 'e' + prox_entidade;
					var descricao = descricaoNR +  " <font color=red>[e" + prox_entidade + "] " + $rootScope.observacaoAssociar + "</font>";
					hierarquia = hierarquia.replace(codigo_raiz, codigo_raiz_novo)
					// trocar o codigo do item avulso para o novo item (entidade+1) e colocar a descricao como norma + observacao em vermelho) manter hierarquia do pai 
					
					var sql = "update checklist_gui set atualizouservidor = 0, codigo=?, descricao=?, secaopai=?, entidade=?, ordenacao=?, codigooriginal=?, hierarquia=?, infracao=? where token=? and codigo=? and ifnull(entidade,0)=?";

					tx.executeSql(sql, [codigo_raiz_novo, descricao, secaopai, prox_entidade, ordenacao, codigooriginal, hierarquia, infracao, $rootScope.tokenGlobal, $rootScope.codigoAssociar, entidadeAssociar])
					
					var sql = "update checklist_fotos set atualizouservidor = 0, codigo=?, entidade=? where token=? and codigo=? and ifnull(entidade,0)=?";
					tx.executeSql(sql, [codigo_raiz_novo, prox_entidade, $rootScope.tokenGlobal, $rootScope.codigoAssociar, entidadeAssociar])
					
					$rootScope.associarNorma = false;
					setTimeout(function() {atualizaoffline();},500);
			
				});
			});
			

		}

		// POPOVERS	
		ons.createPopover('popover.html',{parentScope: $scope}).then(function(popover) {
			$scope.popover = popover;
		});

		ons.createPopover('popover_menu.html',{parentScope: $scope}).then(function(popover_menu) {
			$scope.popover_menu = popover_menu;
		});

		
		ons.createPopover('popover_obs.html',{parentScope: $scope}).then(function(popover_obs) {
			$scope.popover_obs = popover_obs;
		});
		
		ons.createPopover('popover_local.html',{parentScope: $scope}).then(function(popover_local) {
			$scope.popover_local = popover_local;
		});
	
		// * AREA DO POPUP OBSERVACAO

		$scope.observacao = '';
		$scope.codigoobservacao = '';
		$scope.entidadeobservacao = '';
		$scope.indice = '';
		$scope.eventotarget = '';
		
		// * LE OBSERVACAO
		function LeObservacao(index) {
			db.transaction(function(tx) {
				tx.executeSql("Select * from checklist_gui where token=? and codigo=? and ifnull(entidade,0)=?", [$scope.token, $scope.secoes[index].codigo, $scope.secoes[index].entidade], function(tx, results) {
					if (results.rows.length > 0) {
						$scope.observacao = results.rows.item(0).obs;
						$scope.codigoobservacao = results.rows.item(0).codigo;
						$scope.entidadeobservacao = results.rows.item(0).entidade;
					}
				});
			});
		}
			
		// RECONHECIMENTO DE VOZ
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
	
		// CANCELA INSERÇÃO DE OBSERVACAO
		$scope.cancelaobservacao = function() {
			$scope.inserindoobs = false;
			$scope.popover_obs.hide();
		}

		// LIMPA OBSERVACAO
		$scope.limpaobservacao = function() {
			$scope.observacao = "";
		}
		
		// ABRE OBSERVACAO
		$scope.abreObservacao = function() {
			$scope.observacao = $scope.secoes[$scope.indice].obs;
			$scope.codigoobservacao = $scope.secoes[$scope.indice].codigo;
			$scope.entidadeobservacao = $scope.secoes[$scope.indice].entidade;
			if ($scope.entidadeobservacao == undefined) { 
				$scope.entidadeobservacao = 0 
			}
			$scope.popover_menu.hide();
			$scope.popover_obs.show($scope.eventotarget);
		}

		// GRAVA OBSERVACAO
		$scope.gravaobservacao = function() {
			// observacao geral do item
			db.transaction(function(tx) {
				tx.executeSql("update checklist_gui set obs=?, atualizouservidor = 0 where token=? and codigo=? and ifnull(entidade,0)=?", [$scope.observacao, $rootScope.tokenGlobal, $scope.codigoobservacao, $scope.entidadeobservacao], function(tx, res) {
					$rootScope.tevealteracaoitem = true;
					$scope.txtobservacao = $scope.observacao;
					$scope.inserindoobs = false;
					
					var novasecoes = angular.copy($scope.secoes);
					novasecoes[$scope.indice].obs = $scope.observacao;
					$scope.secoes = [];
					$scope.secoes = novasecoes;
					$scope.$apply();
					
					$scope.popover_obs.hide();
					setTimeout(function(){ $scope.$apply(); }, 300);
				});
			
			});
		};

		// * FIM AREA DO POPUP OBSERVACAO
		

		
		// *  AREA DO POPUP LOCAL
		
		$scope.local = '';
		$scope.codigolocal = '';
		$scope.entidadelocal = '';

		// CANCELA INSERÇÃO DE LOCAL
		$scope.cancelalocal = function() {
			$scope.inserindolocal = false;
			$scope.popover_local.hide();
		}

		// LIMPA LOCAL
		$scope.limpalocal = function() {
			$scope.local = "";
		}
		
		// ABRE LOCAL
		$scope.abreLocal = function() {
			
			$scope.local = $scope.secoes[$scope.indice].local;
			if ($scope.local == undefined || $scope.local == "") {
				// SE NAO FOI GRAVADO UM LOCAL ESPECIFICO ENTAO PEGA DO ROOTSCOPE
				$scope.local = $rootScope.local
			}	
			
			$scope.codigoolocal = $scope.secoes[$scope.indice].codigo;
			$scope.entidadelocal = $scope.secoes[$scope.indice].entidade;
			if ($scope.entidadelocal == undefined) { 
				$scope.entidadelocal = 0 
			}
			$scope.popover_menu.hide();
			$scope.popover_local.show($scope.eventotarget);
		}

		// GRAVA LOCAL
		$scope.gravalocal = function() {
			db.transaction(function(tx) {
				var entidade = 0
				if ($scope.secoes[$scope.indice].entidade != undefined) {
					entidade = $scope.secoes[$scope.indice].entidade
				}
				tx.executeSql("update checklist_gui set local=?, atualizouservidor = 0 where token=? and codigo=? and ifnull(entidade,0)=?", [$scope.local, $rootScope.tokenGlobal, $scope.secoes[$scope.indice].codigo, entidade], function(tx, res) {
					$rootScope.tevealteracaoitem = true;
					$scope.inserindolocal = false;
					
					var novasecoes = angular.copy($scope.secoes);
					novasecoes[$scope.indice].local = $scope.local;
					$scope.secoes = [];
					$scope.secoes = novasecoes;

					$scope.popover_local.hide();
					setTimeout(function(){ $scope.$apply(); }, 300);
				});
			
			});
		};

		// * FIM AREA DO POPUP LOCAL
		
		
		// REGISTRA GPS
		$scope.registragps = function() {
			$scope.popover_menu.hide();
			var leugps = function(position) {
				$scope.latitude = position.coords.latitude;
				$scope.longitude = position.coords.longitude;
				$scope.obtendo_gps = false;
				$scope.$apply();
				var entidade = 0
				if ($scope.secoes[$scope.indice].entidade != undefined) {
					entidade = $scope.secoes[$scope.indice].entidade
				}
				
				db.transaction(function(tx) {
					tx.executeSql("update checklist_gui set latitude=?, longitude=?, atualizouservidor = 0 where token=? and codigo=? and ifnull(entidade,0)=?", [position.coords.latitude, position.coords.longitude, $rootScope.tokenGlobal, $scope.secoes[$scope.indice].codigo, entidade], function(tx, res) {
						$rootScope.tevealteracaoitem = true;
						var novasecoes = angular.copy($scope.secoes);
						novasecoes[$scope.indice].latitude = position.coords.latitude;
						novasecoes[$scope.indice].longitude = position.coords.longitude;
						$scope.secoes = [];
						$scope.secoes = novasecoes;
						$scope.$apply();
						});
				});	
			}	
			$scope.obtendo_gps = true;
			$scope.$apply();	
			navigator.geolocation.getCurrentPosition(leugps, deuerro);
		};
		
		var deuerro = function(error) {
			alert("Erro código: " + error.code);
			$scope.obtendo_gps = false;
			$scope.$apply();	
		};	

		// * FOTOS
	
		// TIRA FOTO
		var imageURI;
		var URL_foto;
		$scope.tirafoto =  function(origem) {
			$scope.popover_menu.hide();
			var opcoes =   {
				quality: 50,
				destinationType: Camera.DestinationType.FILE_URI,
				encodingType: Camera.EncodingType.JPEG,
				targetWidth: 800,
				targetHeight: 600,
				correctOrientation: true

			}
			if (origem == 'galeria') {
				 opcoes.sourceType = navigator.camera.PictureSourceType.PHOTOLIBRARY
			}
			navigator.camera.getPicture(tiroufoto, deuerro, opcoes);
		} 
		
		var tiroufoto = function( imgURI ) {
			imageURI = imgURI;
			// resolve file system for image
			window.resolveLocalFileSystemURL(imageURI, gotFileEntry, deuerro);
		}
			
		
		// MOVE A FOTO PARA O DIRETORIO PERMANENTE		
		function gotFileEntry(fileEntry) {
			var d = new Date();
			var nome_arquivo = d.getTime().toString() + '.jpg';
			fileEntry.moveTo(fs.root, nome_arquivo , fsSuccess, deuerro);
		}

		var fsSuccess = function(arquivo) {

			db.transaction(function(tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_fotos (token text, codigo text, nome text, obs text, entidade int, atualizouservidor int)');
				tx.executeSql("INSERT INTO checklist_fotos (token, codigo, nome, entidade) VALUES (?,?,?,?)", [$rootScope.tokenGlobal, $scope.secoes[$scope.indice].codigo, arquivo.name, $scope.secoes[$scope.indice].entidade], function(tx, res) {
					$rootScope.tevealteracaoitem = true;
					var novasecoes = angular.copy($scope.secoes);
					novasecoes[$scope.indice].qtd_fotos ++;
					$scope.secoes = [];
					$scope.secoes = novasecoes;
					$scope.$apply();

				});
			});

			console.log("gravou " + arquivo.name + " - " + arquivo.fullPath);
		}

		// * FIM FOTOS

		// ENTRA ITEM
		$scope.entraItem = function() {
			$scope.popover_menu.hide();
			 $scope.busca = '';
			 $rootScope.busca = '';
			 if( (!angular.element(event.target).hasClass('linkglo')) && (event.target.id != 'imagemanexa') ){
				/* not the <a> entao redireciona, se nao nao faz isso para poder respeitar o link do glossário */
				var secaoPai = $scope.secoes[$scope.indice];
				var secaoAvo = $scope.secaoPai
				$rootScope.secaoPai = secaoPai
				$rootScope.secaoAvo = secaoAvo
				$scope.MeuNavigator.pushPage('itens.html', {secaoPai: secaoPai, secaoAvo: secaoAvo, animation: 'slide'});
			}
		};   

	
		// SHOW DETAIL - NAVEGA PARA SECAO OU ITEM
		$scope.showDetail = function(index, evt) {
			 $scope.busca = '';
			 $rootScope.busca = '';
			 if( (!angular.element(event.target).hasClass('linkglo')) && (event.target.id != 'imagemanexa') ){
				/* not the <a> entao redireciona, se nao nao faz isso para poder respeitar o link do glossário */

				var secaoPai = $scope.secoes[index];
				var secaoAvo = $scope.secaoPai
				$rootScope.secaoPai = secaoPai
				$rootScope.secaoAvo = secaoAvo
				
				
				if (secaoPai.tipo == 'secao')
					$scope.MeuNavigator.pushPage('secoes.html', {secaoPai: secaoPai, secaoAvo: secaoAvo, busca: '', animation: 'slide'});
				if (secaoPai.tipo == 'item') {
					$rootScope.tevealteracaoitem = false;
					$scope.indice = index;
					$scope.eventotarget = evt.target;
					$scope.$apply();
					$scope.popover_menu.show(evt.target);
				
					//$scope.MeuNavigator.pushPage('itens.html', {secaoPai: secaoPai, secaoAvo: secaoAvo, animation: 'slide'});
				}
			 }
		};
				
			
		// VERIFICA VALOR CONFORMIDADE
		$scope.mudaconformidade = function(conforme, codigo, index) {
			var conformidade = "";
			if (conforme == undefined || conforme == '') { conformidade = "sim"; }
			if (conforme == 'sim') { conformidade = "nao"; }
			if (conforme == 'nao') { conformidade = ""; }
			//if (conforme == 'nao se aplica') { conformidade = ""; }

			db.transaction(function(tx) {
				tx.executeSql("update checklist_gui set conforme=?, atualizouservidor = 0 where token=? and codigo=?", [conformidade, $rootScope.tokenGlobal, codigo], function(tx, res) {
					$rootScope.tevealteracaoitem = true;
					var novasecoes = angular.copy($scope.secoes);
					novasecoes[index].conforme = conformidade;
					$scope.secoes = [];
					$scope.secoes = novasecoes;
					$scope.$apply();
				});
			});
		};
		

		if ($rootScope.chkoffline == undefined) 
			$rootScope.chkoffline = true;
		
		if ($scope.secaoPai == undefined || $scope.secaoPai.codigo == undefined) {
			$scope.secaoPai =  {};
			$scope.secaoPai.codigo = '';
		}
		
		var entidade = 0;
		// ABRE FOTO NO BROWSER
		$scope.abrepagina = function(File_Name) {
				var fotoURL = fs.root.nativeURL + "/anexo/" + File_Name;
				window.open(fotoURL, '_blank', 'location=yes');	
		}
		
		if ($scope.secaoPai.entidade != undefined && $scope.secaoPai.entidade != '') {
			entidade = $scope.secaoPai.entidade;
		}
	
		var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);
		
		var PERSISTENT
		if (typeof LocalFileSystem === 'undefined') {
			PERSISTENT = window.PERSISTENT;
		} else {
			PERSISTENT = LocalFileSystem.PERSISTENT ;
		}
		
		var fs;
		window.requestFileSystem(PERSISTENT, 0, 
			function(fileSystem) {
				fs = fileSystem;
				$scope.caminhofoto = fs.root.nativeURL;
			}
			, deuerro);
		
		var deuerro = function(error) {
			alert("Erro código: " + error.code);
			$scope.obtendo_gps = false;
			$scope.$apply();	
		};	
		// CLASSE LISTA		
		$scope.classelista = function(tipo, entidade) {
			if (tipo == "info")
					return 'item lista_azulclaro ng-scope list__item ons-list-item-inner list__item--chevron';
			if (tipo == "secao")
				if (entidade != undefined && entidade > 0) 
					return 'item lista_verde ng-scope list__item ons-list-item-inner list__item--chevron';
				else
					return 'item lista_amarela ng-scope list__item ons-list-item-inner list__item--chevron';
			if (tipo == "item")
				if (entidade != undefined && entidade > 0) 
					return 'item lista_verdeclaro ng-scope list__item ons-list-item-inner list__item--chevron';
				else
					return 'item item ng-scope list__item ons-list-item-inner list__item--chevron';
		}
		// TEM FOTO	
		$scope.tem_foto = function(codigo) {
			db.transaction(function(tx) {
				tx.executeSql("Select count(*) as quantasfotos from checklist_fotos where token=? and codigo=? and ifnull(entidade,0)=?", [$scope.token, $scope.secaoPai.codigo, entidade], function(tx, results) {
					if (results.rows.item(0).quantasfotos > 0)
						return true;
					else
						return false;
				});
			});
		}
		// TEM OBSERVACAO
		$scope.tem_obs = function(codigo) {
			db.transaction(function(tx) {
				tx.executeSql("Select obs from checklist_gui where token=? and codigo=? and ifnull(entidade,0)=?", [$scope.token, $scope.secaoPai.codigo, entidade], function(tx, results) {
					if (results.rows.item(0).obs != undefined && results.rows.item(0).obs != '')
						return true;
					else
						return false;
				});
			});
		}
		// TEM GPS
		$scope.tem_gps = function(codigo) {
			db.transaction(function(tx) {
				tx.executeSql("Select latitude from checklist_gui where token=? and codigo=? and ifnull(entidade,0)=?", [$scope.token, $scope.secaoPai.codigo, entidade], function(tx, results) {
					if (results.rows.item(0).latitude != undefined && results.rows.item(0).latitude != '')
						return true;
					else
						return false;
				});
			});
		}
		
		$scope.items = [];
		
		//COR RESPONDIDOS
		$scope.corRespondidos = function(respondidos, total) {
					if (respondidos == total)
						return 'green';
					else if (respondidos == 0)
						return 'black';
					else
						return 'blue';		
		}
		
		
		//COR ICONE
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
		// ICONE
		$scope.icone = function(conforme) {
					if (conforme == undefined || conforme == '')
						//return 'fa-question'; 
						return "<button class='btn btn-xs' style='background-color:lightgrey; color:black; font-size:10px;'> &nbsp; <i class='fa fa-question'> </i>  &nbsp;  </button>"
					else if (conforme == 'sim')
						//return 'fa-check-square-o';
						return "<button class='btn btn-xs' style='background-color:green; color:white; font-size:10px;'>sim</button>"
					else if (conforme == 'nao')
						//return 'fa-warning';	
						return "<button class='btn btn-xs' style='background-color:red; color:white; font-size:10px;'>não</button>"
					else if (conforme == 'nao se aplica')
						//return 'fa-minus';	
						return "<button class='btn btn-xs' style='background-color:lightblue; color:black; font-size:10px;'> &nbsp; <i class='fa fa-minus'> </i>  &nbsp;  </button>"					
		}

		// REFRESCA
		$scope.refresca = function() {
			atualizaoffline();
		}
		
		// CARREGA SECOES - ATUALIZA OFFLINE
		function atualizaoffline () {			
			$scope.secoes = [];
			db.transaction(function(tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_fotos (token text, codigo text, nome text, obs text, entidade int, atualizouservidor int)');
				var sql = ''

				if ($scope.secaoPai.secaopai != undefined && $scope.secaoPai.secaopai != '') {
					// pegar a secaoavo obtendo a secaopai da secaoatual (para navegacao voltar)
					sqlAvo = "select * from checklist_gui where token = ? and codigo = ?"
					tx.executeSql(sqlAvo, [$scope.token, $scope.secaoPai.secaopai], function(tx, results) {
						row = results.rows.item(0);
						$rootScope.secaoAvo = row;
					})
				}
		
				if ($scope.busca != undefined && $scope.busca != '') {
					sql = "Select *,(select descricao from checklist_gui where codigo = cg.secaopai) as descricaoPai, (select count(*) from checklist_fotos where codigo = cg.codigo and token = cg.token and ifnull(entidade,0) = ifnull(cg.entidade,0)) as qtd_fotos, (select nome from checklist_fotos where codigo = cg.codigo and token = cg.token and ifnull(entidade,0) = ifnull(cg.entidade,0) limit 1) as fotosecao, (select count(*) from checklist_gui where token=cg.token and tipo='item' and hierarquia like cg.hierarquia || '*%' ) as totalitens, (select sum(case when conforme is not null then 1 else 0 end) totalrespondidos from checklist_gui where token = cg.token and tipo='item' and hierarquia like cg.hierarquia || '*%') as respondidos from checklist_gui cg where cg.token=? and cg.descricao like '%" + $scope.busca + "%' or ('lixo' = ?) order by ordenacao, entidade"
				}
				else {
					if ($scope.secaoPai.codigo == '00') {
						// se for a secao de avulsos, ordena em ordem inversa para os ultimos aparecerem no topo
						sql = "Select *, (select count(*) from checklist_fotos where codigo = cg.codigo and token = cg.token and ifnull(entidade,0) = ifnull(cg.entidade,0)) as qtd_fotos, (select nome from checklist_fotos where codigo = cg.codigo and token = cg.token and ifnull(entidade,0) = ifnull(cg.entidade,0) limit 1) as fotosecao, (select count(*) from checklist_gui where token=cg.token and tipo='item' and hierarquia like cg.hierarquia || '*%' ) as totalitens, (select sum(case when conforme is not null then 1 else 0 end) totalrespondidos from checklist_gui where token = cg.token and tipo='item' and hierarquia like cg.hierarquia || '*%') as respondidos from checklist_gui cg where cg.token=? and cg.secaopai=? order by ordenacao desc, entidade"
					}
					else {
						sql = "Select *, (select descricao from checklist_gui where codigo = cg.secaopai) as descricaoPai, (select count(*) from checklist_fotos where codigo = cg.codigo and token = cg.token and ifnull(entidade,0) = ifnull(cg.entidade,0)) as qtd_fotos, (select nome from checklist_fotos where codigo = cg.codigo and token = cg.token and ifnull(entidade,0) = ifnull(cg.entidade,0) limit 1) as fotosecao, (select count(*) from checklist_gui where token=cg.token and tipo='item' and hierarquia like cg.hierarquia || '*%' and ifnull(desabilitada,0) = 0) as totalitens, (select sum(case when conforme is not null then 1 else 0 end) totalrespondidos from checklist_gui where token = cg.token and tipo='item' and hierarquia like cg.hierarquia || '*%') as respondidos from checklist_gui cg where cg.token=? and cg.secaopai=? and ifnull(desabilitada,0) = 0 order by ordenacao, entidade"
					}
				}
				tx.executeSql(sql, [$scope.token, $scope.secaoPai.codigo], function(tx, results) {
						for (var i=0; i < results.rows.length; i++){
							row = results.rows.item(i);
							row.descricaocomglossario = row.descricao.replace("<(glo", "<a id=linkglossario class=linkglo ng-click=showglossario($event,");
							$scope.secoes.push(row);
						}
						if (results.rows.length == 0) {
							$scope.nenhumItemEncontrado = true
						}
						$scope.$apply();
					}, function(a, b) {
						 alert(b.message);
					}		
				);
			});
		}
	
    	// SHOW GLOSSARIO
		$scope.showglossario = function(e, codglo) {
			db.transaction(function(tx) {
				tx.executeSql("Select * from glossario where codigo=?", [codglo], function(tx, results) {
					$scope.termoglossario = results.rows.item(0).termo;
					$scope.descricaoglossario = results.rows.item(0).descricao;
				})
			})
			$scope.popover.show(e.target);
		};	
		
	
		// VOLTAR
		$scope.voltar = function() {
			 if( (!angular.element(event.target).hasClass('linkglo')) && (event.target.id != 'imagemanexa') ){
				/* not the <a> entao redireciona, se nao nao faz isso para poder respeitar o link do glossário */
				$rootScope.secaoPai = $rootScope.secaoAvo
				tabbar.loadPage('secoes.html')
			 }
		};
		
		// VOLTA AO TOPO
		$scope.VoltaTopo = function(index) {
			$rootScope.secaoPai = '';
			var pages = MeuNavigator.getPages();
			var quantas_paginas = pages.length
			for (var i=1; i < quantas_paginas; i++) {
				$scope.MeuNavigator.popPage({animation: 'none'})
			}
		}
				
		$scope.PaginaConfig = function() {

			$scope.MeuNavigator.pushPage('config.html',{secaoPai: $scope.secaoPai, secaoAvo: $scope.secaoAvo, animation: 'slide'})
			
		}
		
		atualizaoffline();	

}]);

	// ImportaChecklist  Controller *********************************************************
	// *******************************************************************************

    app.controller('ImportaController', function($scope, $rootScope, $http, transformRequestAsFormPost ) {
		$scope.token = $rootScope.tokenGlobal
		var checklist_secoes = [];
		var glossario = [];
		$scope.conta_atualizando = 0;
		var page = MeuNavigator.getCurrentPage();
		$scope.nomechecklist = page.options.nomechecklist;
		$scope.atualizando = false;
		$scope.total_itens = 0;
		
		var fs;
		window.requestFileSystem(PERSISTENT, 0, function(fileSystem) {
			fs = fileSystem;
			var directoryEntry = fs.root; // to get root path of directory
			directoryEntry.getDirectory('anexos', { create: true, exclusive: false }, onDirectorySuccess, onDirectoryFail); // creating folder in sdcard
		}
		, fail);
		
		function onDirectorySuccess(parent) {
			// Directory created successfuly
			//alert("diretorio criado: " + parent.name);
		}

		function onDirectoryFail(error) {
			//Error while creating directory
			alert("Unable to create new directory: " + error.code);
		}	

		var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);

		$scope.AtualizaBanco = function() {
			puxaglossario();
			puxabanco();
		}
	
		$scope.VoltaTopo = function(index) {
			$scope.MeuNavigator.pushPage('secoes.html',{secaoPai: $rootScope.secaoPai, animation: 'slide'});

		}
		
		function puxabanco() {
			$scope.atualizando = true;
			var urljson = 'http://gnrx.com.br/secoes.asp?token=' + $scope.token + '&pai=99999&hora=' + Date.now();
			$http({method: 'GET', url: urljson}).
			success(function(data, status, headers, config) {
				checklist_secoes = data.secoes;
				criabanco();
			}).
			error(function(data, status, headers, config) {
				alert('erro no arquivo json (importando checklist)' +  status.message);
				$scope.atualizando = false;
			});	
		};
		
	
		function puxaglossario() {
			$scope.atualizando = true;
			var urljson = 'http://gnrx.com.br/puxaglossario.asp?hora=' + Date.now();
			$http({method: 'GET', url: urljson}).
			success(function(data, status, headers, config) {
				glossario = data.glossario;
				criabancoGlossario();
			}).
			error(function(data, status, headers, config) {
				alert('erro no arquivo json (importando glossario)' +  status.message);
				$scope.atualizando = false;
			});	
		};

		function criabancoGlossario() {
			db.transaction(function(tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS glossario (codigo int, termo text, descricao text)');
				$scope.total_itens_glossario = glossario.length;
				var cont = 0;
				for (var i=0;i < glossario.length; i++) {
					var entidade = glossario[i].entidade
					var sql = "INSERT INTO glossario (codigo, termo, descricao) VALUES ('"+glossario[i].codigo+"','"+glossario[i].termo+"','"+glossario[i].descricao+"')";
					tx.executeSql(sql,[], function(tx, res) {
						$scope.conta_atualizando_glossario = cont;
						cont++;
						if (cont == glossario.length - 1) {
							$scope.atualizandoglossario = false;
							alert('glossario atualizado ' + glossario.length + ' termos ');
							//$scope.MeuNavigator.pushPage('escolhechecklist.html', {secaoPai: [], animation: 'slide'});	
						}
						$scope.$apply();
					}, function(dados, erro) {
						console.log(JSON.stringify(erro.message));
					});
				}
			});	
		};

		
		function filetransfer(download_link, fp) {
			var fileTransfer = new FileTransfer();
			// File download function with URL and local path
			fileTransfer.download(download_link, fp,
					function (entry) {
						//alert("download complete: " + entry.fullPath);
					},
				 function (error) {
					 //Download abort errors or download failed errors
					// alert("download error source " + error.source);
				 }
			);
		}		

		
		function criabanco() {
			//db = window.openDatabase({name: "my.db"});

			db.transaction(function(tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_gui (token text, codigo text, descricao text, secaopai text, tipo text, conforme text, obs text, latitude text, longitude text,datalimite text, entidade int, ordenacao text, codigooriginal text, atualizouservidor int, imagemanexa text, hierarquia text, infracao int, desabilitada int)');
				tx.executeSql("DELETE from checklist_gui where token = ?", [$rootScope.tokenGlobal], function(tx, resultado) {
					$scope.total_itens = checklist_secoes.length;
					var cont = 0;
					for (var i=0;i < checklist_secoes.length; i++) {
						var entidade = checklist_secoes[i].entidade
						if (entidade == '') { entidade = null; }
						if (checklist_secoes[i].anexo != undefined && checklist_secoes[i].anexo != '') {
							//alert('anexo: ' + checklist_secoes[i].anexo);
							var File_Name = checklist_secoes[i].anexo;
							// aqui tem que fazer o download da imagem e gravar no fs 
							var rootdir = fs.root;
							var fp = fs.root.nativeURL 
							fp = fp + "/anexo/" + File_Name;
							var download_link = 'http://gnrx.com.br/imagensanexas/' + File_Name;
							filetransfer(download_link, fp);
						}
						// em vez de inserir vazio, deve inserir null 
						var sql = "INSERT INTO checklist_gui (token, codigooriginal, descricao, secaopai, tipo, datalimite, ordenacao, entidade, codigo, atualizouservidor, imagemanexa) VALUES ('"+$rootScope.tokenGlobal+"','"+checklist_secoes[i].codigo+"','"+checklist_secoes[i].descricao+"','"+checklist_secoes[i].secaopai+"','"+checklist_secoes[i].tipo+"','"+checklist_secoes[i].datalimite+"','"+checklist_secoes[i].ordenacao+"',"+entidade+",'" + checklist_secoes[i].codigo + "',1,'"+checklist_secoes[i].anexo+"')";
						tx.executeSql(sql,[], function(tx, res) {
							$scope.conta_atualizando = cont;
							cont++;
						
							if (cont == checklist_secoes.length - 1) {
								$scope.atualizando = false;
								$scope.MeuNavigator.pushPage('escolhechecklist.html', {secaoPai: [], animation: 'slide'});	
							}
							$scope.$apply();
						}, function(dados, erro) {
							console.log(JSON.stringify(erro.message));
						});
					}
				}, function(dados, erro) {
							console.log(JSON.stringify(erro.message));

					}
				);	
					
			});
		};
		
		function fail(error) {
			alert('erro: ' + JSON.stringify(error));
		}

	});
	
	// CONFIG Controller *********************************************************
	// *******************************************************************************
    app.controller('ConfigController', function($scope, $rootScope, $http, transformRequestAsFormPost, FotoService ) {
		$scope.token = $rootScope.tokenGlobal
		var checklist_secoes = [];
		$scope.conta_atualizando = 0;
		$scope.conta_atualizando_servidor = 0;
		$scope.conta_atualizando_fotos_servidor = 0;
		$scope.total_para_servidor = 0;
		$scope.total_fotos_para_servidor = 0;
		
		$scope.totalitens = 0;
		$scope.totalrespondidos = 0;
		$scope.totalconforme = 0;
		$scope.totalnaoconforme = 0;
		$scope.totalnaoseaplica = 0;
		
		$scope.incluirconforme = true;
		$scope.incluirnaoconforme = true;
		$scope.incluirfotos = true;
		$scope.incluirgps = true;
		
		$scope.exibircodigonorma = $rootScope.exibircodigonorma
		$scope.exibirnumerador = $rootScope.exibirnumerador
		
		$scope.nomechecklist = $rootScope.nomechecklist;
		
		/* var page = MeuNavigator.getCurrentPage();
		$scope.secaoPai = page.options.secaoPai;
		$scope.secaoAvo = page.options.secaoAvo;
		var codigo = $scope.secaoPai.codigo;
		$rootScope.MeuNavigator = $scope.MeuNavigator;
		$rootScope.secaoPai = $scope.secaoPai;
		$rootScope.secaoAvo = page.options.secaoAvo; */
		
		var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);
				
		if ($rootScope.tokenGlobal == undefined) {
			alert('Escolha uma inspeção');
		}
		
		if 	($rootScope.tokenGlobal != undefined && $scope.secaoPai.codigo == undefined) {
			db.transaction(function(tx) {
				tx.executeSql("Select * from checklist_gui where token = ? and (secaoPai is null or secaopai = '')", [$rootScope.tokenGlobal], function(tx, results) {
					$scope.secaoPai = results.rows.item(0);
					$rootScope.secaoPai = results.rows.item(0);
				})
			})
		};
		
		$scope.secaoPai = $rootScope.secaoPai
		$scope.secaoAvo = $rootScope.secaoAvo
		var codigo = $scope.secaoPai.codigo;
		
		$scope.email = localStorage.getItem('emailusuario');
		
		$scope.exibirnumeradorchange = function() {
			$rootScope.exibirnumerador = $scope.exibirnumerador
		}
		$scope.exibircodigonormachange = function() {
			$rootScope.exibircodigonorma = $scope.exibircodigonorma
		}
		
		// RELATORIO	
		$scope.relatorio = function(index) {	
			$scope.atualizando = true;
			$scope.$apply;
			localStorage.setItem('emailusuario',$scope.email);
			// ATUALIZA SERVIDOR
			$scope.atualizaservidor();	
			// CHAMA ENVIO DE EMAIL NO SERVIDOR $HTTP	
			var urljson = "http://gnrx.com.br/checklist_relatorio_email.asp "
			$http({method: 'POST',
				   url: urljson,
				   transformRequest: transformRequestAsFormPost,
				   data: {token: $rootScope.tokenGlobal,
						  secaopai: $rootScope.secaoPai.codigo,
						  nomesecao: $rootScope.secaoPai.descricao,
						  incluirconforme: $scope.incluirconforme,
						  incluirnaoconforme: $scope.incluirnaoconforme,
						  incluirfotos: $scope.incluirfotos,
						  incluirgps: $scope.incluirgps,
						  nomeusuario: $scope.nomeusurio,
						  email: $scope.email
				   }
			}).
			success(function(data, status, headers, config) {
				//alert('e-mail enviado para  ' +  $scope.email);
			}).
			error(function(data, status, headers, config) {
				alert('erro de rede ' +  status.message);
			});	 

		}

		// VOLTAR
		$scope.voltar = function() {
				//$rootScope.secaoPai = $rootScope.secaoAvo
				tabbar.loadPage('escolhechecklist.html')
		};		

		var entidade = 0;
		
		if ($scope.secaoPai.entidade != undefined && $scope.secaoPai.entidade != '') {
			entidade = $scope.secaoPai.entidade;
		}
			

	    var fs;
		window.requestFileSystem(PERSISTENT, 0, 
			function(fileSystem) {	fs = fileSystem	}
			, fail);
			

		
		// PEGA FOTO SECAO	
		db.transaction(function(tx) {
			tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_fotos (token text, codigo text, nome text, obs text, entidade int, atualizouservidor int)');
			tx.executeSql("select nome from checklist_fotos where token = ? and codigo = ? and ifnull(entidade,0)=? ", [$scope.token, $scope.secaoPai.codigo, entidade], function(tx, results) {
					if (results.rows.length > 0) {
						$scope.fotosecao = fs.root.nativeURL + results.rows.item(0).nome;
						$scope.$apply();
					}
				}, function(a, b) {
					 alert(b.message);
				}
					
			);
		});
				
		// ENTRA PERSONALIZA	
		$scope.personalizaChecklist = function(index) {
			$scope.MeuNavigator.pushPage('personalizaChecklist.html',{secaoPai: $rootScope.secaoPai, animation: 'slide'});
		}
	
		// ENTRA EDICTA	
		$scope.editaChecklist = function(index) {
			$scope.MeuNavigator.pushPage('editachecklist.html',{secaoPai: $rootScope.secaoPai, animation: 'slide'});
		}
		
		// BUSCAR	
		$scope.buscar = function(index) {
			$rootScope.busca = $scope.busca
			//tabbar.loadPage("secoes.html")
			$scope.MeuNavigator.pushPage('secoes.html',{secaoPai: $rootScope.secaoPai, busca: $scope.busca, animation: 'slide'});

		}
	
		// TIRA FOTO
		$scope.tirafotosecao = function()	{
			FotoService.tirafoto('', codigo, entidade);
		}		
		
		// CLONA SECAO	
		$scope.clonasecao = function(tipo) {
				if (tipo == 'secao') {
					var result = confirm('Confirma a duplicação da seção ' + $scope.secaoPai.descricaoPai + ' e suas subseções?');
				}
				else {
					var result = confirm('Confirma a duplicação do item ' + $scope.secaoPai.descricao );
				}
				if (result ){	
					ons.notification.prompt({
					  message: "Descrição da nova entidade:",
					  callback: function(nome) {
						  clonasecao_acao(nome, tipo);
					  }
					});
				}
			}
			
		// CLONA ACAO
		function clonasecao_acao(nome, tipo) {
			var codigo_raiz	
			if (tipo == 'secao') {
				codigo_raiz = $scope.secaoPai.secaopai;
			}
			else {
				codigo_raiz = $scope.secaoPai.codigo;
			}
			
			
			db.transaction(function(tx) {
				tx.executeSql("select max(ifnull(entidade,0)) as entidade from checklist_gui where token=? and codigooriginal = ? ", [$scope.token, codigo_raiz], function(tx, results) {
					var prox_entidade = results.rows.item(0).entidade + 1;
					var codigo_raiz_novo = codigo_raiz + 'e' + prox_entidade;
					
					var sql1 = "insert into checklist_gui (token, codigooriginal, descricao, secaopai, tipo, entidade, ordenacao, codigo, hierarquia, infracao) select token, codigooriginal, descricao || ' <font color=red>[e" + prox_entidade + "] " + nome + "</font>', secaopai, tipo, " + prox_entidade + ", ordenacao, '" + codigo_raiz_novo + "', replace(hierarquia, '" + codigo_raiz + "', '" + codigo_raiz_novo + "'),0 from checklist_gui cg where token=? and codigo =? ";

					
					var sql2 = "insert into checklist_gui (token, codigooriginal, descricao, secaopai, tipo, entidade, ordenacao, codigo, hierarquia, infracao) select token, codigooriginal, descricao, replace(secaopai, '" + codigo_raiz + "', '" + codigo_raiz_novo + "'), tipo, entidade, ordenacao, replace(codigo, '" + codigo_raiz + "', '" + codigo_raiz_novo + "'), replace(hierarquia, '" + codigo_raiz + "', '" + codigo_raiz_novo + "'), infracao   from checklist_gui cg where token = ? and hierarquia like ? and ifnull(entidade,0) = 0";
					
					// mudar para usar a hierarquia em vez do codigo *********


					
					tx.executeSql(sql1, [$rootScope.tokenGlobal, codigo_raiz], function(tx, res) {
							console.log('inserindo secao pai ' + codigo_raiz);
							if (tipo == 'secao') {
								VoltaSecaoBisAvo();
							}
							else {
								VoltaSecaoAvo();
							}
								
						}, function(a,b) {
							alert(b.message)
						}
					);
					
					
					if (tipo == 'secao') {
						tx.executeSql(sql2, [$rootScope.tokenGlobal, $scope.secaoAvo.hierarquia + '*%'], function(tx, res) {
							console.log('inserindo secoes filhas de ' + codigo_raiz);
							}, function(a,b) {
								alert(b.message)
							}
						);
					}

				},
				function(a,b) {
					alert(b.message);
				}
				);
			});			
		}
		
		$scope.AtualizaBanco = function() {
			puxabanco();
		}

		function VoltaSecaoAvo() {
			//tabbar.loadPage("secoes.html")
		 	$scope.MeuNavigator.popPage({onTransitionEnd : function() {
				$scope.MeuNavigator.popPage({onTransitionEnd : function() {
					$scope.MeuNavigator.replacePage('secoes.html', {secaoPai: $rootScope.secaoAvo, animation : 'none' } );
				}})
			}})			 
		}


		function VoltaSecaoBisAvo() {
			//tabbar.loadPage("secoes.html")
		 	$scope.MeuNavigator.popPage({onTransitionEnd : function() {
				$scope.MeuNavigator.popPage({onTransitionEnd : function() {
					$scope.MeuNavigator.popPage({onTransitionEnd : function() {
						var secaoPaiAux = {};
						secaoPaiAux.codigo = $rootScope.secaoAvo.secaopai
						
						$scope.MeuNavigator.replacePage('secoes.html', {secaoPai: secaoPaiAux, animation : 'none' } );
					}})
				}})
			}})			 
		}

		
		
		// VOLTA AO TOPO
		$scope.VoltaTopo = function(index) {
			$rootScope.secaoPai = '';
			var pages = MeuNavigator.getPages();
			var quantas_paginas = pages.length
			for (var i=1; i < quantas_paginas; i++) {
				$scope.MeuNavigator.popPage({animation: 'none'})
			}
		}
		
		$scope.entraescolha = function(index) {
			$scope.MeuNavigator.pushPage('escolhechecklist.html',{secaoPai: '', animation: 'slide'})
		}
		
		// APAGA SEÇÃO
		$scope.apagasecao = function(index) {
				var result = confirm('Confirma exlusão da seção ' + $scope.secaoPai.descricao + ', suas subseções, fotos e informações?');
				if (result ){
 						db.transaction(function(tx) {
							tx.executeSql('DELETE FROM  checklist_gui WHERE token = ? and codigo=? ',[$rootScope.tokenGlobal, codigo]);
							tx.executeSql('DELETE FROM  checklist_gui WHERE token = ? and codigo like ? ',[$rootScope.tokenGlobal, codigo + '.%']);
							tx.executeSql('DELETE FROM  checklist_fotos WHERE token = ? and codigo like ? ',[$rootScope.tokenGlobal, codigo + '.%']);
						});
						var a=1;
 					//$scope.MeuNavigator.pushPage('escolhechecklist.html',{secaoPai: '', animation: 'slide'});
 					//pegasecoes(codigo, entidade, 'deletar');
					//apagaItensSecao(codigo, entidade)
					VoltaSecaoAvo();
				}
		}

		
		// APAGA CHECKLIST INTEIRO
		$scope.apagachecklist = function(index) {
				var result = confirm('Confirma exlusão de toda inspeção ' + $rootScope.nomechecklist + ', suas subseções, fotos e informações?');
				if (result ){
 						db.transaction(function(tx) {
							tx.executeSql('DELETE FROM  check_cab WHERE token = ? ',[$rootScope.tokenGlobal]);
							tx.executeSql('DELETE FROM  checklist_gui WHERE token = ? ',[$rootScope.tokenGlobal]);
							tx.executeSql('DELETE FROM  checklist_fotos WHERE token = ? ',[$rootScope.tokenGlobal]);
						});
					$scope.VoltaTopo();
					alert('Inspeção apagada, recarregue a tela');
				}
		}
		
		
		// APAGA FOTO
		$scope.apagafotosecao = function() {
			var result = confirm('deseja apagar a foto?');
			if (result) {
				var nomearquivo = $scope.fotosecao.split('/').pop();
				var root = fs.root;
				root.getFile(nomearquivo, {create: false}, apagafoto_acao, null); 
				db.transaction(function(tx) {
						tx.executeSql("DELETE from checklist_fotos where token=? and codigo=? and nome=?", [$rootScope.tokenGlobal, $scope.secaoPai.codigo, nomearquivo], function(tx, res) {
							$rootScope.tevealteracaoitem = true;
							$scope.fotosecao = '';
							$scope.$apply();
						});
				});		
			}
		}
		
		// APAGA FOTO_ACAO
		function apagafoto_acao(fileEntry) {
			fileEntry.remove(null, null);
		}

		// CONTA REGISTROS *** DESATUALIZADO SEM USO (SUBSTITUIDO PELO PEGASECOES E CONTAITENSSECAO
		//contaregistrosbanco();
		function contaregistrosbanco() {
			db.transaction(function(tx) {

					tx.executeSql("select count(1) totalitens,  sum(case when conforme is not null then 1 else 0 end) totalrespondidos,  sum(case conforme when 'sim' then 1 else 0 end) totalconforme,   sum(case conforme when 'nao' then 1 else 0 end) totalnaoconforme ,   sum(case conforme when 'nao se aplica' then 1 else 0 end) totalnaoseaplica, sum(case ifnull(atualizouservidor,0) when 0 then 1 else 0 end) totalparaatualizar, sum(case ifnull(atualizouservidor,0) when 0 then 1 else 0 end) totalparaatualizar, (select sum(case ifnull(atualizouservidor,0) when 0 then 1 else 0 end) from checklist_fotos where codigo = cg.codigo) totalfotosparaatualizar from checklist_gui cg where token=? and codigo like ? and tipo='item' ", [$scope.token, $scope.secaoPai.codigo + '.%'], function(tx, results) {
						
					$scope.totalitens = results.rows.item(0).totalitens;
					$scope.totalrespondidos = results.rows.item(0).totalrespondidos;
					$scope.totalconforme = results.rows.item(0).totalconforme;
					$scope.totalnaoconforme = results.rows.item(0).totalnaoconforme;
					$scope.totalnaoseaplica = results.rows.item(0).totalnaoseaplica;
					$scope.total_para_servidor = totalparaatualizar;
					$scope.total_fotos_para_servidor = totalfotosparaatualizar;
					$scope.$apply();
				},
				function(a,b) {
					alert(b.message);
				}
				);
			});
		};

		// APAGA ITENS SECAO
		function apagaItensSecao(codigopai) {
			db.transaction(function(tx) {
				// apaga a propria secao
				tx.executeSql("DELETE FROM  checklist_gui WHERE token = ? and codigo=?  and tipo='secao'",[$rootScope.tokenGlobal, codigopai], 	function(tx, results) {
						alert('deletei secao codigo ' + codigopai );
					},
					function(a,b) {
						alert(b.message);
					}
				);
				// apaga os itens da secao
				tx.executeSql("DELETE FROM  checklist_gui WHERE token = ? and secaopai=?  and tipo='item'",[$rootScope.tokenGlobal, codigopai],
					function(tx, results) {
						alert('deletei itens secaopai= ' + codigopai );
					},
					function(a,b) {
						alert(b.message);
					}
				);
				// apaga as fotos dos itens da secao
				tx.executeSql("DELETE FROM  checklist_fotos WHERE token = ? and codigo like ? ",[$rootScope.tokenGlobal, codigopai + '.%']);
			});
		};		
		
		// CONTA ITENS CHAMADA
		contaItensHierarquia($scope.secaoPai.secaopai, $scope.secaoPai.hierarquia);
		// CONTA ITENS
		function contaItensHierarquia(codSecaoPai, codHierarquia) {
			db.transaction(function(tx) {
			if (codSecaoPai == undefined || codSecaoPai == '') {
				sql = "select count(1) totalitens,  ifnull(sum(case when conforme is not null then 1 else 0 end),0) totalrespondidos,  sum(case conforme when 'sim' then 1 else 0 end) totalconforme,  sum(case conforme when 'nao' then 1 else 0 end) totalnaoconforme ,   sum(case conforme when 'nao se aplica' then 1 else 0 end) totalnaoseaplica,sum(case ifnull(atualizouservidor,0) when 0 then 1 else 0 end) totalparaatualizar, sum(case ifnull(atualizouservidor,0) when 0 then 1 else 0 end) totalparaatualizar, (select count(1) from checklist_fotos where ifnull(atualizouservidor,0) = 0 and token=?) totalfotosparaatualizar  from checklist_gui cg where token=? and tipo='item' or ('lixo' = ?)"
			}
			else {
				//sql = "select count(1) totalitens,  ifnull(sum(case when conforme is not null then 1 else 0 end),0) totalrespondidos,  sum(case conforme when 'sim' then 1 else 0 end) totalconforme,  sum(case conforme when 'nao' then 1 else 0 end) totalnaoconforme ,   sum(case conforme when 'nao se aplica' then 1 else 0 end) totalnaoseaplica,sum(case ifnull(atualizouservidor,0) when 0 then 1 else 0 end) totalparaatualizar, sum(case ifnull(atualizouservidor,0) when 0 then 1 else 0 end) totalparaatualizar, (select count(1) from checklist_fotos where ifnull(atualizouservidor,0) = 0 and token=?) totalfotosparaatualizar  from checklist_gui cg where token=? and codigo like ? and tipo='item'"
				
				sql = "select count(1) totalitens,  ifnull(sum(case when (conforme is not null and conforme != '') then 1 else 0 end),0) totalrespondidos,  sum(case conforme when 'sim' then 1 else 0 end) totalconforme,  sum(case conforme when 'nao' then 1 else 0 end) totalnaoconforme ,   sum(case conforme when 'nao se aplica' then 1 else 0 end) totalnaoseaplica, (select count(1) from checklist_gui where (conforme is not null or obs is not null or latitude is not null)) totalparaatualizar, (select count(1) from checklist_fotos where token=? ) totalfotosparaatualizar  from checklist_gui cg where token=? and hierarquia like ? and tipo='item'"
				
				
			}
		tx.executeSql(sql, [$scope.token, $scope.token, codHierarquia + '*%'],
				function(tx, results) {
					$scope.totalitens += results.rows.item(0).totalitens;
					$scope.totalrespondidos += results.rows.item(0).totalrespondidos;
					$scope.totalconforme += results.rows.item(0).totalconforme;
					$scope.totalnaoconforme += results.rows.item(0).totalnaoconforme;
					$scope.totalnaoseaplica += results.rows.item(0).totalnaoseaplica;
					$scope.total_para_servidor = results.rows.item(0).totalparaatualizar;
					$scope.total_fotos_para_servidor = results.rows.item(0).totalfotosparaatualizar;					
					$scope.$apply();
					},
				function(a,b) {
					alert(b.message);
					}
				);
			});
			
		};	

		
		// EM DESUSO
		function contaItensSecao(codigopai) {
			db.transaction(function(tx) {
				tx.executeSql("select count(1) totalitens,  ifnull(sum(case when conforme is not null then 1 else 0 end),0) totalrespondidos,  sum(case conforme when 'sim' then 1 else 0 end) totalconforme,  sum(case conforme when 'nao' then 1 else 0 end) totalnaoconforme ,   sum(case conforme when 'nao se aplica' then 1 else 0 end) totalnaoseaplica  from checklist_gui cg where token=? and secaopai=? and tipo='item' ", [$scope.token, codigopai],
				function(tx, results) {
					$scope.totalitens += results.rows.item(0).totalitens;
					$scope.totalrespondidos += results.rows.item(0).totalrespondidos;
					$scope.totalconforme += results.rows.item(0).totalconforme;
					$scope.totalnaoconforme += results.rows.item(0).totalnaoconforme;
					$scope.totalnaoseaplica += results.rows.item(0).totalnaoseaplica;
					$scope.$apply();
					},
				function(a,b) {
					alert(b.message);
					}
				);
			});
			
		};	
	
		// PEGA OUTRAS SUBSECOES E VAI NAVEGANDO NA ARVORE PRA BAIXO  EM DESUSO
		function pegasecoes(codigopai, acao) {
			db.transaction(function(tx) {
				tx.executeSql("select codigo, ifnull(entidade,0) entidade from checklist_gui cg where token=? and secaopai=? and tipo='secao' ", [$scope.token, codigopai],
				function(tx, results) {
					for (var i=0; i < results.rows.length; i++) {
						var codigosecao = results.rows.item(i).codigo;
						var entidadesecao = results.rows.item(i).entidade;
						pegasecoes(codigosecao, entidadesecao, acao);
						if (acao == 'contar') {
							contaItensSecao(codigosecao,entidadesecao);
						}
						if (acao == 'deletar') {
							apagaItensSecao(codigosecao, entidadesecao)
						}
					}
				},
				function(a,b) {
					alert(b.message);
				}
				);
			});
		};	

		var conta_chamadas_simultaneas = 0;   
		var funcArray = [];     // Array of functions waiting
		var MAX_REQUESTS = 5;   // Max requests
		var CALL_WAIT = 500;        // 100ms

			
		// ATUALIZA SERVIDOR
		$scope.atualizaservidor = function() {
			//db = window.openDatabase({name: "my.db"});

			// atualiza dados itens
			db.transaction(function(tx) {
				tx.executeSql("select * from check_cab where token = ?", [$rootScope.tokenGlobal], function(tx, results) { 
					row = results.rows.item(0);
					atualizaCheckServidor($rootScope.tokenGlobal, row.codigo, row.nome, row.modelo, row.datacriacao, row.empresa, row.local, row.num_funcionarios);
				})
				tx.executeSql("select * from checklist_gui where token = ? and ((conforme is not null  or obs is not null or latitude is not null) or ifnull(atualizouservidor,0) = 0)", [$rootScope.tokenGlobal], function(tx, results) {
				//tx.executeSql("select * from checklist_gui where  ifnull(atualizouservidor,0) = 0 and token = '" + $rootScope.tokenGlobal + "'", [], function(tx, results) {
						$scope.total_para_servidor = results.rows.length;
						$scope.conta_atualizando_servidor = 0
						$scope.$apply();
						for (var i=0; i < results.rows.length; i++){
							row = results.rows.item(i);
							atualizaItemServidor($rootScope.tokenGlobal, row.codigo, row.conforme, row.obs, row.latitude, row.longitude, row.tipo, row.secaopai, row.entidade, row.descricao, row.codigooriginal, row.hierarquia, row.local);
							tx.executeSql("update checklist_gui set atualizouservidor = 1 where codigo = '" + row.codigo + "' and token = '" + $rootScope.tokenGlobal + "'");
						}
					},
				function(a,b) {
					alert(b.message)
				}
				);
			});
		
	
			$scope.limite_envios_simultaneos = 0;
			// SELECIONA FOTOS PARA UPDATE PARA SERVIDOR
			db.transaction(function(tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_fotos (token text, codigo text, nome text, obs text, entidade int, atualizouservidor int)');
				tx.executeSql("select * from checklist_fotos where token = '" + $rootScope.tokenGlobal + "'", [], function(tx, results) {
						$scope.total_fotos_para_servidor = results.rows.length;
						$scope.conta_atualizando_fotos_servidor = 0
						$scope.$apply();
						for (var i=0; i < results.rows.length; i++){
							row = results.rows.item(i);
							var token = row.token;
							var codigo = row.codigo;
							var nome = row.nome;
							var obs = row.obs;
							var entidade = row.entidade;
							var uri_arquivo = fs.root.nativeURL + nome;
							row.uri_arquivo = uri_arquivo;
							funcArray.push(row)
							//funcArray.push(uploadFoto(uri_arquivo, token, codigo, nome, obs, entidade ));
							//uploadFoto(uri_arquivo, token, codigo, nome, obs, entidade );
						}
						// CHAMA O CHAMADOR DE UPLOADS
						call();
					}
				);
			});
		

			// CHAMADA PARA UPLOAD DE FOTO COM CONTROLE DO LIMITE DE CONEXCOES SIMULTANEAS
			function call()
			{
				// Check if count doesn't exceeds or if there aren't any functions to call
				if (funcArray.length == 0) {
					return true;
				}
				if(conta_chamadas_simultaneas >= MAX_REQUESTS || funcArray.length == 0) {
					// Call call() after 100ms
					setTimeout(function() { call() }, CALL_WAIT);
				}
				else
				{
					conta_chamadas_simultaneas++;           
					var parametros = funcArray.pop();
					var token = parametros.token;
					var codigo = parametros.codigo;
					var nome = parametros.nome;
					var obs = parametros.obs;
					var entidade = parametros.entidade;
					var uri_arquivo = parametros.uri_arquivo 
					uploadFoto(uri_arquivo, token, codigo, nome, obs, entidade );
					call();
				}
			}
		};

	// ATUALIZA CHECKLIST CABECALHO NO SERVIDOR $HTTP	
	function atualizaCheckServidor(token, codigo, nome, modelo, datacriacao, empresa, local, num_funcionarios) {
		var urljson = 'http://gnrx.com.br/atualizaCheckServidor.asp';
		$http({method: 'POST',
			   url: urljson,
			   transformRequest: transformRequestAsFormPost,
					data: {
						token: token,
						codigo: codigo,			
						nome: nome,
						modelo: modelo,
						datacriacao: datacriacao,
						empresa: empresa,
						local: local,
						num_funcionarios: num_funcionarios,
						usuario: localStorage.getItem('login')
					}
				}).
		success(function(data, status, headers, config) {
		
		}).
		error(function(data, status, headers, config) {
			alert('erro no json ' +  status.message);
		});	
	}; 

	// ATUALIZA ITEM SERVIDOR $HTTP	
	function atualizaItemServidor(token, codigo, conforme, obs, latitude, longitude, tipo, secaopai, entidade, descricao, codigooriginal, hierarquia, local) {
		var urljson = 'http://gnrx.com.br/atualizaItemServidor.asp';
		$http({method: 'POST',
			   url: urljson,
			   transformRequest: transformRequestAsFormPost,
					data: {
						token: token,
						codigo: codigo,
						conforme: conforme,
						obs: obs,
						latitude: latitude,
						longitude: longitude,
						tipo: tipo,
						secaopai: secaopai,
						entidade: entidade,						
						descricao: descricao,
						codigooriginal: codigooriginal,
						hierarquia: hierarquia,
						local: local
					}
				}).
		success(function(data, status, headers, config) {
			//alert(JSON.stringify(data));
			$scope.conta_atualizando_servidor ++;
			if ($scope.conta_atualizando_servidor == $scope.total_para_servidor && $scope.conta_atualizando_fotos_servidor == $scope.total_fotos_para_servidor) {
				$scope.atualizando = false
				alert('dados sincronizados com servidor  ');
			}
			$scope.$apply();
		}).
		error(function(data, status, headers, config) {
			alert('erro de rede ' +  data);
		});	
	}; 
	
	var auxgui;
	
	// UPLOAD FOTO FILETRANSFER
	function uploadFoto(imageURI, token, codigo, nome, obs, entidade ) {
		var options = new FileUploadOptions();
		options.fileKey="file";
		options.fileName=imageURI.substr(imageURI.lastIndexOf('/')+1);
		options.mimeType="image/jpeg";

		var params = new Object();
		params.token = token;
		params.codigo = codigo;
		params.nome = nome;
		params.obs = obs;
		params.entidade = entidade;

		options.params = params;
		options.chunkedMode = false;

		auxgui = codigo;
		var ft = new FileTransfer();
		console.log ("subindo foto  " + codigo  + " " + imageURI + " tam fila:  " + funcArray.length + " conta simultaneos: " + conta_chamadas_simultaneas + " - " + Date.now());
		ft.upload(imageURI, "http://gnrx.com.br/uploadFoto.asp", win, fail, options);
	}

	// SUCESSO UPLOAD
	function win(r) {
		var codigo = auxgui;

		var retorno = {}
	    retorno = JSON.parse(r.response)
		
		console.log ('retorno ok ' + retorno.codigo + ' ' + Date.now() +  " Sent: " + r.bytesSent);
		console.log("Sent = " + r.bytesSent);		
		

		$scope.conta_atualizando_fotos_servidor ++;
		conta_chamadas_simultaneas --;
		db.transaction(function(tx) {
			tx.executeSql("update checklist_fotos set atualizouservidor = 1 where token = '" & retorno.token & "' and codigo = '" + retorno.codigo + "' nome = '" + retorno.nome + "'");
		});
		var a=1;
		if ($scope.conta_atualizando_servidor == $scope.total_para_servidor && $scope.conta_atualizando_fotos_servidor == $scope.total_fotos_para_servidor) {
			$scope.atualizando = false
			alert('dados sincronizados com o servidor  ');
		}
		$scope.$apply();	
	}

	
	function fail(error) {
		alert('erro: ' + JSON.stringify(error));
	}
		
	
	
	});	

	// ITENS Controller *********************************
	// **************************************************
    app.controller('ItensController', function($interval, $scope,  $sce, $compile, $rootScope, $http) {
		
		if ($rootScope.tokenGlobal == undefined) {
			alert('Escolha um checklist')
			tabbar.loadPage("escolhechecklist.html")
			return
		}
		$scope.token = $rootScope.tokenGlobal;
		var page = MeuNavigator.getCurrentPage();
		
		$scope.ios = ons.platform.isIOS();
		
		$scope.voltarDeItemAvulso = false
		$scope.criandoNovoItemAvulso = false
		$scope.inserindoobs = false;
		$scope.inserindolocal = false;
		$scope.txtlocal = "";
		$scope.txtobservacao = "";
		$scope.obtendo_gps = false;
		$scope.tevealteracao = false;
		$scope.podeExcluir = false;
			
		var db = window.openDatabase("MeuBanco", "1.0", "Cordova Demo", 200000);
		
		$scope.associarNorma = function() {
			$rootScope.associarNorma = true
			$rootScope.codigoAssociar = $scope.secaoPai.codigo;
			$rootScope.entidadeAssociar = $scope.secaoPai.entidade;
			$rootScope.observacaoAssociar = $scope.secaoPai.obs;
			$scope.VoltaTopo()
		}
		
		// DUPLICAR
		$scope.duplicar = function() {
			if ( ($scope.secaoPai.descricao.indexOf('[e') >= 0) || ( ($scope.secaoPai.descricaoPai != undefined) && ($scope.secaoPai.descricaoPai.indexOf('[e') >= 0) )  || ($scope.secaoPai.secaopai == '00') ) {
				alert('Este item já é uma cópia. Volte e escolha o item original para duplicar ');
				return
			}
			$scope.MeuNavigator.pushPage('duplicar.html',{secaoPai: $scope.secaoPai, animation: 'slide'})
		}
		
		// PODE EXCLUIR?
		if ( (($scope.secaoPai.descricao != undefined && $scope.secaoPai.descricao.indexOf('[e') >= 0)) || ( ($scope.secaoPai.descricaoPai != undefined) && ($scope.secaoPai.descricaoPai.indexOf('[e') >= 0) ) || ($scope.secaoPai.secaopai == '00') ) {
			$scope.podeExcluir = true;
		}		
		
		// EXCLUIR ITEM
		$scope.excluirItem = function() {
			db.transaction(function(tx) {
				tx.executeSql("DELETE from checklist_gui where token=? and codigo=? and ifnull(entidade,0)=?", [$rootScope.tokenGlobal, $scope.secaoPai.codigo, $scope.secaoPai.entidade], function(tx, res) {
					$rootScope.tevealteracaoitem = true;
					$scope.MeuNavigator.popPage({onTransitionEnd : function() {
						$scope.MeuNavigator.replacePage('secoes.html', {secaoPai: $rootScope.secaoAvo, posicao: $scope.secaoPai.codigo, animation : 'none' } );
					}});
				});
			})
		}

		
		// PREENCHE SECAO PAI
		if (page.options == undefined || page.options.secaoPai == undefined || page.options.secaoPai.codigo == undefined || page.options.secaoPai.tipo == 'secao') {
			// INSERIR ITEM AVULSO
			$scope.criandoNovoItemAvulso = true
			$scope.voltarDeItemAvulso = true
			var proximocodigo
			$scope.descricaoitem = "Inserindo nova ocorrência avulsa. Digite uma observação para começar. Depois você poderá pesquisar e associar esta ocorrência ao item correto da norma"
			$scope.inserindoobs = true;
			// verifica qual o ultimo codigo de itens avulsos
			db.transaction(function(tx) {
				tx.executeSql("select * from checklist_gui where token = ? and codigo like '00.%' order by codigo desc" , [$rootScope.tokenGlobal], function(tx, res) {
					if (res.rows.length == 0) {
						proximocodigo = '001'
					}
					else {
						var codigo = res.rows.item(0).codigo
						codigo = codigo.substring(3,6)
						var n = Number(codigo) + 1
						// coloca 3 casas com 00 padding
						proximocodigo  = (n<10? '00' : n<100? '0' : '') + n;
					}
					$scope.secaoPai = {}
					$scope.secaoPai.codigo = '00.' + proximocodigo
					$scope.$apply()
				},
				function(a,b) {
					alert(b.message)
				})
			})
		}
		else {
			$scope.secaoPai = page.options.secaoPai;
			if (page.options.secaoAvo != undefined) {
				$rootScope.secaoAvo = page.options.secaoAvo;
			}
			$scope.descricaoitem = $scope.secaoPai.descricao.replace("<(glo", "<a style='color: blue; text-decoration: underline;' ng-click=showglossario($event,")		
		}
		
		var entidade = 0;

		if ($scope.secaoPai.entidade != undefined && $scope.secaoPai.entidade != '') {
			entidade = $scope.secaoPai.entidade;
		}
			
	
		// ABRE FOTO NO BROWSER
		$scope.abrefoto = function(File_Name) {
				//var fotoURL = fs.root.nativeURL + "/anexo/" + File_Name;
				var fotoURL = File_Name;
				window.open(fotoURL, '_blank', 'location=yes');	
		}

		// RECONHECIMENTO DE VOZ
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
	
		// CANCELA INSERÇÃO DE OBSERVACAO
		$scope.cancelaobservacao = function() {
			$scope.inserindoobs = false;
			if ($scope.criandoNovoItemAvulso == true) {
				$scope.MeuNavigator.popPage({animation: 'none'})
			}
		}
	
		// VOLTA AO TOPO
		$scope.VoltaTopo = function(index) {
			$rootScope.secaoPai = '';
			var pages = MeuNavigator.getPages();
			var quantas_paginas = pages.length
			for (var i=1; i < quantas_paginas -1 ; i++) {
				$scope.MeuNavigator.popPage({animation: 'none'})
			}
			setTimeout(function(){ $scope.$apply(); }, 500);
		}

		
		// ATIVA INSERÇÃO DE OBSERVACAO
		$scope.inserirobservacao = function() {
			$scope.inserindoobs = true;
			$scope.observacao = $scope.txtobservacao;
			
		}
		
		// LIMPA OBSERVACAO
		$scope.limpaobservacao = function() {
			$scope.observacao = "";
		}
		
		// GRAVA OBSERVACAO
		$scope.gravaobservacao = function() {
			if ($scope.criandoNovoItemAvulso == true) {
				// item avulso -> devo criar um novo registro
				criaItemAvulso()
			}

			// observacao geral do item
			db.transaction(function(tx) {
				tx.executeSql("update checklist_gui set obs=?, atualizouservidor = 0 where token=? and codigo=? and ifnull(entidade,0)=?", [$scope.observacao, $rootScope.tokenGlobal, $scope.secaoPai.codigo, entidade], function(tx, res) {
					$rootScope.tevealteracaoitem = true;
					$scope.txtobservacao = $scope.observacao;
					$scope.inserindoobs = false;
					if ($scope.txtobservacao != undefined && $scope.txtobservacao != '') {
						$scope.cor_icone_obs = "#1284ff";
					}
					else {
						$scope.cor_icone_obs = "#000000";
					}
					
					setTimeout(function(){ $scope.$apply(); }, 300);
					// por algum motivo se nao der o timeout o botao fica clareado como se estivesse desabilitado
					
				});
			
			});
		};

		// CRIA NOVO ITEM AVULSO
		function criaItemAvulso() {
			// vefifica se ja existe secao Itens Avulsos e cria se nao existir
			db.transaction(function(tx) {
				tx.executeSql("select * from checklist_gui where token = ? and codigo = '00'",[$rootScope.tokenGlobal], function(tx, res) {
					if (res.rows.length == 0) { 
						tx.executeSql("insert into checklist_gui(token, codigo, secaopai, descricao, tipo, ordenacao, hierarquia) values (?,?,?,?,?,?,?)",[$rootScope.tokenGlobal,'00','','Itens Avulsos','secao','.00','00'])
					}
				},
				function(a,b) {
					alert(b.message)
				})
			
				// cria o novo registro
				tx.executeSql("insert into checklist_gui(token, codigo, descricao, tipo, ordenacao, hierarquia, secaopai, obs) values (?,?,?,?,?,?,?,?)",[$rootScope.tokenGlobal,$scope.secaoPai.codigo,$scope.observacao,'item','.' + $scope.secaoPai.codigo,'00*'+$scope.secaoPai.codigo,'00',$scope.observacao])
				$scope.descricaoitem = $scope.observacao
				$scope.criandoNovoItemAvulso = false
				$scope.VoltaTopo();
				setTimeout(function(){$scope.MeuNavigator.replacePage('secoes.html', {secaoPai: {}, secaoAvo: {}, animation: 'none'});},500)
			})
		}
		
		// CANCELA INSERÇÃO DE LOCAL
		$scope.cancelalocal = function() {
			$scope.inserindolocal = false;
		}
	
		// ATIVA INSERÇÃO DE LOCAL
		$scope.inserirlocal = function() {
			$scope.inserindolocal = true;
			if ($scope.txtlocal == '') {
				$scope.local = $scope.txtlocal;
			}
			else {
				$scope.local = $rootScope.local
			}
		}
		
		// LIMPA LOCAL
		$scope.limpalocal = function() {	
			$scope.local = '';
		}
		
		// GRAVA LOCAL
		$scope.gravalocal = function() {
			// observacao geral do item
			db.transaction(function(tx) {
				tx.executeSql("update checklist_gui set local=?, atualizouservidor = 0 where token=? and codigo=? and ifnull(entidade,0)=?", [$scope.local, $rootScope.tokenGlobal, $scope.secaoPai.codigo, entidade], function(tx, res) {
				});
			});
			$scope.inserindolocal = false;
			$scope.txtlocal = $scope.local;
			$rootScope.local = $scope.local;
			// altera o rootScope.local para sugerir este local para o próximo registro
			setTimeout(function(){ $scope.$apply(); }, 300);
			// por algum motivo se nao der o timeout o botao fica clareado como se estivesse desabilitado
		};
		
		// MOSTRA GLOSSARIO
		$scope.showglossario = function(e, codglo) {
			db.transaction(function(tx) {
				tx.executeSql("Select * from glossario where codigo=?", [codglo], function(tx, results) {
					$scope.termoglossario = results.rows.item(0).termo;
					$scope.descricaoglossario = results.rows.item(0).descricao;
				})
			})
			$scope.popover.show(e.target);
		};
		
		ons.createPopover('popover.html',{parentScope: $scope}).then(function(popover) {
			$scope.popover = popover;
		});
		  
		
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

		// PREENCHE ENTIDADDE FOTOS E DEMAIS CAMPOS DO ITEM
		$scope.fotos = [];
		ledados();
		function ledados() {
			$scope.fotos = [];
			db.transaction(function(tx) {
				tx.executeSql("Select * from checklist_gui where token=? and codigo=? and ifnull(entidade,0)=?", [$scope.token, $scope.secaoPai.codigo, entidade], function(tx, results) {
					if (results.rows.length > 0) {
						$scope.txtobservacao = results.rows.item(0).obs;
						$scope.observacao = results.rows.item(0).obs;
						$scope.txtlocal = results.rows.item(0).local;
						$scope.local = results.rows.item(0).local;					
						$scope.latitude = results.rows.item(0).latitude;
						$scope.longitude = results.rows.item(0).longitude;
						$scope.conformidade = results.rows.item(0).conforme;

						if ($scope.local == undefined || $scope.local == "") {
							$scope.local = $rootScope.local
						}
						if ($scope.txtobservacao != undefined && $scope.txtobservacao != '')
							$scope.cor_icone_obs = "#1284ff";
						else
							$scope.cor_icone_obs = "#000000";
				
						tx.executeSql("Select * from checklist_fotos where token=? and codigo=? and ifnull(entidade,0)=?", [$scope.token, $scope.secaoPai.codigo, entidade], function(tx, results) {
							for (var i=0;i<results.rows.length;i++) {
								var fotoURL = fs.root.nativeURL + results.rows.item(i).nome;
								var foto = {url: fotoURL ,observacao: results.rows.item(i).obs};
								$scope.fotos.push(foto);
								$scope.$apply();
							};
						});	
						$scope.$apply();				
					}
				});
			});
		};
		

		// VERIFICA VALOR CONFORMIDADE
		$scope.verificavalor = function() {
			db.transaction(function(tx) {
				tx.executeSql("update checklist_gui set conforme=?, atualizouservidor = 0 where token=? and codigo=? and ifnull(entidade,0)=?", [$scope.conformidade, $rootScope.tokenGlobal, $scope.secaoPai.codigo, entidade], function(tx, res) {
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
				var result = confirm("Deseja substituir esta foto?");
				if (result) {
					$scope.tirafoto(param_url);
				}
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

		// VOLTA SECOES
		$scope.VoltaSecoes = function() {
			if ($rootScope.tevealteracaoitem && 1==2) {
				$scope.MeuNavigator.popPage({onTransitionEnd : function() {
					$scope.MeuNavigator.replacePage('secoes.html', {secaoPai: $rootScope.secaoAvo, posicao: $scope.secaoPai.codigo, animation : 'none' } );
				}});	
			}
			else {
				if ($scope.voltarDeItemAvulso == true) {
					tabbar.setActiveTab(0)
				}
				else {
					$scope.MeuNavigator.popPage();
				}
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
				tx.executeSql("update checklist_gui set latitude=?, longitude=?, atualizouservidor = 0 where token=? and codigo=? and ifnull(entidade,0)=?", [position.coords.latitude, position.coords.longitude, $rootScope.tokenGlobal, $scope.secaoPai.codigo, entidade], function(tx, res) {
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
				targetWidth: 800,
				targetHeight: 600,
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
			var d = new Date();
			var nome_arquivo = d.getTime().toString() + '.jpg';
			fileEntry.moveTo(fs.root, nome_arquivo , fsSuccess, deuerro);
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
					tx.executeSql("update checklist_fotos set nome =?, atualizouservidor = 0 where token=? and codigo=? and nome=?", [arquivo.name, $rootScope.tokenGlobal, $scope.secaoPai.codigo, nome_foto], function(tx, res) {
						$rootScope.tevealteracaoitem = true;
						ledados();
					});
				});
			}
			else {
				db.transaction(function(tx) {
					tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_fotos (token text, codigo text, nome text, obs text, entidade int, atualizouservidor int)');
					tx.executeSql("INSERT INTO checklist_fotos (token, codigo, nome, entidade) VALUES (?,?,?,?)", [$rootScope.tokenGlobal, $scope.secaoPai.codigo, arquivo.name, entidade], function(tx, res) {
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


		var entidade = 0;
		
		if ($scope.secaoPai.entidade != undefined && $scope.secaoPai.entidade != '') {
			entidade = $scope.secaoPai.entidade;
		}
			
		var entidadeb = entidade;
		
		

		var recognizing;
		var recognition = new SpeechRecognition();
		recognition.continuous = false;
		recognition.maxAlternatives = 1;
		recognition.lang = 'pt-BR'
		reset();
		recognition.onend = reset;

		
		$scope.reseta = function () {
			recognition = new SpeechRecognition();
			recognition.continuous = false;
			recognition.maxAlternatives = 1;
			recognition.lang = 'pt-BR'
			recognition.onend = reset;
			alert('reiniciado');
		}		
		
		
		recognition.onerror = function (event, a, b) {
			alert(JSON.stringify(event));
			alert(JSON.stringify(a));
			alert(JSON.stringify(b));
		}
			
			
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

		$scope.PararDitado = function() {
			recognition.stop();
			reset();
		  } 
		
		$scope.Ditar = function() { 
		/* 	recognition = undefined;
			recognition = new SpeechRecognition();
			recognition.continuous = false;
			recognition.maxAlternatives = 1;
			recognition.lang = 'pt-BR'
			recognition.onend = reset; */
			
			recognition.start();
			recognizing = true;
			$scope.ouvindo = true;
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
				tx.executeSql("update checklist_gui set obs=?, atualizouservidor = 0 where token=? and codigo=? and ifnull(entidade,0)=?", [$scope.observacao, $rootScope.tokenGlobal, $scope.secaoPai.codigo, entidade], function(tx, res) {
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

	
//    FACTORY FOTOSERVICE
app.factory('FotoService', function($rootScope) {
	return {
		tirafoto: function(url, codigo, entidade) {
			var URL_foto = url;
			var imageURI;
			
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
		
		
			navigator.camera.getPicture(tiroufoto, deuerro,
			  {
				quality: 50,
				destinationType: Camera.DestinationType.FILE_URI,
				encodingType: Camera.EncodingType.JPEG,
				targetWidth: 1024,
				correctOrientation: true

			});
			
			
			function tiroufoto(imgURI) {
				imageURI = imgURI;
				// resolve file system for image
				window.resolveLocalFileSystemURL(imageURI, gotFileEntry, deuerro);
			}


			// MOVE A FOTO PARA O DIRETORIO PERMANENTE		
			function gotFileEntry(fileEntry) {
				fileEntry.moveTo(fs.root, fileEntry.name , fsSuccess, deuerro);
			}

			// GRAVA TABELA FOTO
			function fsSuccess(arquivo) {
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
						tx.executeSql("update checklist_fotos set nome =?, atualizouservidor=0 where token=? and codigo=? and nome=? and ifnull(entidade,0)=?", [arquivo.name, $rootScope.tokenGlobal, codigo, nome_foto, entidade], function(tx, res) {
							$rootScope.tevealteracaoitem = true;
							ledados();
						});
					});
				}
				else {
					db.transaction(function(tx) {
						tx.executeSql('CREATE TABLE IF NOT EXISTS checklist_fotos (token text, codigo text, nome text, obs text, entidade int, atualizouservidor int)');
						tx.executeSql("INSERT INTO checklist_fotos (token, codigo, nome, entidade) VALUES (?,?,?,?)", [$rootScope.tokenGlobal, codigo, arquivo.name, entidade], function(tx, res) {
							$rootScope.tevealteracaoitem = true;
							//ledados();
						});
					});
				}
				console.log("gravou " + arquivo.name + " - " + arquivo.fullPath);
				//alert("gravou " + arquivo.name + " - " + arquivo.fullPath);
				//$rootScope.MeuNavigator.replacePage('config.html', {secaoPai: $rootScope.secaoPai, animation : 'none' } );
				
				$rootScope.MeuNavigator.popPage({onTransitionEnd : function() {
					$rootScope.MeuNavigator.popPage({onTransitionEnd : function() {
						$rootScope.MeuNavigator.replacePage('secoes.html', {secaoPai: $rootScope.secaoAvo, secaoAvo: {}, animation : 'none' } );
					}})
				}})
			}

			function deuerro(error) {
				alert("Erro código: " + error.code);	
			};				


	// aqui entra conteudo funcoes
	
	// termina aqui
		
		}
	}
});


// SECOES DATA FACTORY	
	
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

app.directive('compile', ['$compile', function ($compile) {
    return function(scope, element, attrs) {
      scope.$watch(
        function(scope) {
          // watch the 'compile' expression for changes
          return scope.$eval(attrs.compile);
        },
        function(value) {
          // when the 'compile' expression changes
          // assign it into the current DOM
          element.html(value);

          // compile the new DOM and link it to the current
          // scope.
          // NOTE: we only compile .childNodes so that
          // we don't get into infinite loop compiling ourselves
          $compile(element.contents())(scope);
        }
    );
  };
}]);

app.directive('ngBlur', ['$parse', function($parse) {
  return function(scope, element, attr) {
    var fn = $parse(attr['ngBlur']);
    element.bind('blur', function(event) {
      scope.$apply(function() {
        fn(scope, {$event:event});
      });
    });
  }
}]);

})();