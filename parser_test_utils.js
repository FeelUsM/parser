;(function(){
function main(module, exports, require) {
"use strict";
	RegExp.prototype.toJSON = function(){ return '/'+this.source+'/' }
	Function.prototype.toJSON = function() { return 'function('+this.length+')'; }

	function assertDeepEqual(real,expected) {
		try{
			assert.deepEqual(expected,real);
		}
		catch(err){
			err.message+='\nreal: '+JSON.stringify(real,'',4)+
			'\nexpected: '+JSON.stringify(expected,'',4)+
			'\ndiff: '+JSON.stringify(DeepDiff(expected,real),'',4);
			throw err
		}
	}
	exports.assertDeepEqual = assertDeepEqual;
	function assertPrepareDeepEqual(real,expected){
		//return assertDeepEqual(real,expected)
		try {
			assertDeepEqual(error_prepare(real),expected);
		}
		catch(err) {
			err.message +='\nunprepared: '+JSON.stringify(real,'',4);
			throw err;
		}
	}
	exports.assertPrepareDeepEqual = assertPrepareDeepEqual;
	if(typeof global === 'undefined') {
		var global = window;
	}

	function compile(fun) {
		if(typeof fun === 'string') fun = global[fun];
		function do_compile(pattern,obj) {
			assertPrepareDeepEqual(fun.exec(pattern),obj);
		}
		do_compile.toString = ()=>'assertPrepareDeepEqual('+fun+'.exec(pattern),obj);'
		return do_compile;
	}
	exports.compile = compile;
	function it_compile(pattern,obj,code,comment='') {
		if(typeof code ==='string') code = compile(code);
		function tmp() {
			code(pattern,obj);
		}
		tmp.toString = code.toString.bind(code);
		it(comment+'"'+pattern+'" ---> '+JSON.stringify(obj),tmp);
	}
	exports.it_compile = it_compile;
	function it_err_compile(pattern,efun,code,comment='') { // efun - error func
		if(typeof code ==='string') code = compile(code);
		function tmp() {
			code(pattern,efun());
		}
		tmp.toString = code.toString.bind(code);
		var efs = efun.toString(); // error func string
		efs = /^\(\)=>/.test(efs) ? efs.slice(4) : efs;
		it(comment+'"'+pattern+'" ---> '+efs,tmp);
	}
	exports.it_err_compile = it_err_compile;
	function parse(fun) {
		if(!fun) fun = 'reg_sequence';
		if(typeof fun === 'string') fun = global[fun];
		function do_parse(pattern,str,res) {
			var inres = {res:{}};
			var funobj = fun.exec(pattern);
			if(!funobj.fun)
				throw new Error('compile error: '+JSON.stringify(funobj,'',4))
			var err = funobj.fun(str,{x:0},inres);
			assertDeepEqual(err,true);
			assertDeepEqual(inres.res,res);
		}
		do_parse.toString = ()=>'var inres = {res:{}};\n'+
			'assertDeepEqual('+fun+'.exec(pattern).fun(str,{x:0},inres),true);\n'+
			'assertDeepEqual(inres.res,res);'
		return do_parse;
	}
	exports.parse = parse;
	function it_parse(pattern,str,res,code,comment='') {
		if(typeof code ==='string' || typeof code==='undefined') code = parse(code);
		function tmp() {
			code(pattern,str,res);
		}
		tmp.toString = code.toString.bind(code);
		it(comment+'"'+pattern+'" ---> fun('+str+' ---> '+JSON.stringify(res)+') -> true',tmp);
	}
	exports.it_parse = it_parse;
	function err_parse(fun) {
		if(!fun) fun = 'reg_sequence';
		if(typeof fun === 'string') fun = global[fun];
		function do_parse(pattern,str,res) {
			var inres = {res:{}};
			var funobj = fun.exec(pattern);
			if(!funobj.fun)
				throw new Error('compile error: '+JSON.stringify(funobj,'',4))
			assertPrepareDeepEqual(funobj.fun(str,{x:0},inres),res);
		}
		do_parse.toString = ()=>'var inres = {res:{}};\n'+
			'assertPrepareDeepEqual('+fun+'.exec(pattern).fun(str,{x:0},inres),res);'
		return do_parse;
	}
	exports.err_parse = err_parse;
	function it_err_parse(pattern,str,efun,code,comment='') {
		if(typeof code ==='string' || typeof code==='undefined') code = err_parse(code);
		function tmp() {
			code(pattern,str,efun());
		}
		tmp.toString = code.toString.bind(code);
		var efs = efun.toString();
		efs = /^\(\)=>/.test(efs) ? efs.slice(4) : efs;
		it(comment+'"'+pattern+'" ---> fun('+str+') -> '+efs,tmp);
	}
	exports.it_err_parse = it_err_parse;
	function _describe(){} // для выключения групп тестов
	exports._describe = _describe;
	
	exports.testing_enabled = true;
	exports.tests = {__type:'cat'}
	/*
		{
			__type:'cat',
			//__name:'ln',
			shn1:{
				__type:'cat',
				__name:'ln1';
				shn11:{
					__type:'test',
					__fun:function fun(){}
				},
				shn12:{},
				shn13:{}
			},
			shn2:{},
			shn3:{}
		}
	*/
	function path_resolve(path_name) {
		var path = path_name.split('/');
		if(path.length==0)	throw new Error('путь теста или категории не должен быть пустым');
		if(path[0]!='') throw new Error('путь теста или категории должен быть абсолютным');
		if(path[path.length-1]=='') path.length--;
		var target = exports.tests;
		for(var i=1; i<path.length; i++) {
			if(path[i] in target)
				target = target[path[i]];
			else {
				path.length = i+1;
				throw new Error('не могу найти путь к тесту или категории: /'+path.join('/'));
			}
		}
		return target;
	}
	function add_category(path,short_name,long_name) {
		if(!exports.testing_enabled) return;
		var target = path_resolve(path);
		if(target.__type != 'cat') 
			throw new Error('категорию можно добавить только в категорию: '+path);
		if(short_name in target) 
			throw new Error('вы пытаетесь повторно добавить тест с именем '+short_name+' в '+path);
		target[short_name] = {__type:'cat',__name:long_name};
	}
	exports.add_category = add_category;
	function add_test(path,short_name,fun) {
		if(!exports.testing_enabled) return;
		var target = path_resolve(path);
		if(target.__type != 'cat') 
			throw new Error('тест можно добавить только в категорию: '+path);
		if(short_name in target) 
			throw new Error('вы пытаетесь повторно добавить тест с именем '+short_name+' в '+path);
		target[short_name] = {__type:'test',__fun:fun};
	}
	exports.add_test = add_test;
	exports.reverse_run_nests = [0];
	
	function run_category(cat,path,nest) {
		function description() {
			var names = [];
			for(var name in cat)
				if(name!='__type' && name!='__name')
					names.push(name);
			if(nest in exports.reverse_run_nests)
				for(var i=names.length-1; i>=0; i--)
					iter(names[i]);
			else
				for(var i=0; i<names.length; i++)
					iter(names[i]);

			function iter(name){
				if(cat[name].__type=='cat')
					run_category(cat[name],path+'/'+name,nest+1);
				else if((cat[name].__type=='test'))
					cat[name].__fun(path+'/'+name);
				else throw new Error('неизвестный тип у '+name);
			}
		}
		if(nest==0)
			description();
		else
			describe('('+path+') '+cat.__name,description)
	}
	function run_tests() {
		run_category(tests,'',0);
	}
	exports.run_tests = run_tests;
}
	try{
		if(loaded_modules) { // it is not node.js
			module = new Module();
			main(module, module.exports, require);
			loaded_modules["parser_test_utils"] = module.exports; 
		}
		else throw new Error('loaded_modules is false')
	}
	catch(err){ // node.js
		if(err instanceof ReferenceError && err.message=='loaded_modules is not defined')
			main(module, exports, require);
		else
			throw err;
	}
})()
