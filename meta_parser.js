// требует utils
;(function(){
function main(module, exports, require) {
"use strict";

var test = require('parser_test_utils');
test.add_category('/','meta_parser','');

/*
exports.ParseError = ParseError;
exports.FatalError = FatalError;
exports.isGood = isGood;
exports.notFatal = notFatal;
exports.isFatal = isFatal;

exports.messageAdder = messageAdder;
exports.fatalCollect = fatalCollect;
exports.parseCollect = parseCollect;
exports.error_prepare = error_prepare;

exports.read_all = read_all
exports.Pattern = Pattern;
exports.Forward = Forward;

exports.err_txt = err_txt;
exports.read_txt = read_txt;
exports.txt = txt;

exports.err_rgx = err_rgx;
exports.read_rgx = read_rgx;
exports.rgx = rgx;

exports.read_opt = read_opt;
exports.opt = opt;

exports.read_seq = read_seq;
exports.need_all = need_all;
exports.need = need;
exports.need_none = need_none;
exports.seq = seq;

exports.read_rep = read_rep;
exports.rep = rep;
exports.star = star;

exports.read_any = read_any;
exports.any = any;

exports.err_exc = err_exc;
exports.exc = exc;
*/

/*
seq - последовательность
any - перечисление (альтернатив)
rep - цикл
opt - опциональный/необязательный

** - для LL-парсера есть отличие от контекстно-свободных:
если в перечислении был получен удачный результат, то прочитанный фрагмент уже не может быть прочитан по другому:
"a(bc|b|x)cc" ---> fun(abcc) -> err_rgx(3,/cc/.source)
"a(bc|b|x)cc" ---> fun(axcc ---> "axcc") -> true
впрочем этого всегда можно избежать подобрав другую эквивалентную БНФ, например такую:
"a(bccc?|xcc)"
*/
//{ === ошибки ===
/*
Каким бы сложным язык ни был, мы создаем контекстно-свободный** над-язык*, который описывается БНФ.
(* - если текст удовлетворяет правилам языка, то он удовдетворяет и правилам над-языка. 
Обратное вообще говоря не верно.)
Результатом такого разбора является синтаксическое дерево.
А дальше узлам этого дерева (если точнее - продукциям БНФ, по которым разобраны эти узлы)
можно сопоставить фунции (далее называемые обработчиками), которые обрабатывают результаты дочерних узлов, 
и возвращают результат в удобном для дальнейшего использования виде.

Если текст не удовлетворяет этой БНФ, происходит FatalError, и разбор прекращается.
т.е. FatalError-ы объединяются друг в друга при перечислениях и tail_error-е в ошибку-объединение
в последовательностях они просто проскакивают как есть + обработчик ошибки

Если текст удовлетворяет БНФ (т.е. правилам над-языка), но не удовлетворяет праивлам самого языка,
то хотябы один из обработчиков вместо результата должен возвратить ParseError.
В этом случае разбор по БНФ продолжается как ни в чем ни бывало (ведь текст удовлетворяет БНФ), 
-> но удачные результаты соседних узлов (соседних с узлом, где произошёл ParseError) - игнорируются****,
а ошибки - накапливаются (вплоть до FatalError конечно***).
(**** а также в поле .res помещаются все требуемые результаты и ошибки 
	(если конечно не произошёл fatal).
	это поле после выполнения обработчика ошибки будет удалено)
Родительский узел узла или узлов, вернувших ParseError, не выполняет свой обработчик,
и возвращает безымянный ParseError, содержащий в себе набор из всех этих ошибок,
после чего выполняет обработчик ошибки этого узла,
который может задать имя этой ошибке например при помощи messageAdder, который ведет себя так:
	Обработчик ошибки задает имя, если его нет, иначе 
	для FtalError-а создает ошибку-обертку FatalError с заданным именем,
	а для ParseError-а создает ошибку-обертку ParseError с заданным именем
если требуется боле сложная обработка ошибки, например с использованием .res - в ручную

в перечислениях они просто проскакивают как есть + обработчик ошибки
 - это в meta_parser-е, 
а в parser-е - имя задается, если оно указано для данной продукции БНФ.
т.е. ParseError-ы объединяются друг в друга в паттернах, имеющих имя.


*** в этом месте начинают взаимодействовать FatalError-ы c ParseError-ами
т.е. в последовательностях ParseError-ы объединяются с FatalError-ом
	и создается безымянный FatalError.
	если он был безымянным - вначале извлекается его содержимое
перечисления (и tail_error) - ведут себя как обычно

иными словами 
ParseError - мы поняли то что прочитали, но это не то, что мы хотим
FatalError - мы не поняли, что прочитали
*/

function ParseError(where,what,why,res){
	console.assert(typeof where == 'number','in ParseError where ('+where+') is not a number')
	this.err = 'parse';
	this.where = where;
	this.what = what;
	this.why = why; // не обязательный
	this.res = res; // не обязательный, после обработчика удаляется
}
exports.ParseError = ParseError;
function FatalError(where,what,why){
	console.assert(typeof where == 'number','in ParseError where ('+where+') is not a number')
	this.err = 'fatal';
	this.where = where;
	this.what = what;
	this.why = why; // не обязательный
}
exports.FatalError = FatalError;
// is result
function isGood(r){
	return (typeof r === 'object' && r!==null) ? r.err!='parse' && r.err!='fatal' : r!==undefined ;
}
exports.isGood = isGood;
test.add_test('/meta_parser','isGood',(path)=>{
	describe(path,function(){
		it('sould be TRUE for: number 0',function(){
			assert.equal(isGood(0),true);
		})
		it('sould be TRUE for: number 2',function(){
			assert.equal(isGood(2),true);
		})
		it('sould be TRUE for: empty string',function(){
			assert.equal(isGood(''),true);
		})
		it('sould be TRUE for: not empty string',function(){
			assert.equal(isGood('123'),true);
		})
		it('sould be TRUE for: {}',function(){
			assert.equal(isGood({}),true);
		})
		it('sould be TRUE for: {err:0}',function(){
			assert.equal(isGood({err:0}),true);
		})
		it('sould be TRUE for: {err:1}',function(){
			assert.equal(isGood({err:1}),true);
		})
		it('sould be TRUE for: {err:2}',function(){
			assert.equal(isGood({err:2}),true);
		})
		it("sould be FALSE for: {err:'parse'}",function(){
			assert.equal(isGood({err:'parse'}),false);
		})
		it("sould be FALSE for: {err:'fatal'}",function(){
			assert.equal(isGood({err:'fatal'}),false);
		})
		it('sould be TRUE for: {err:"str"}',function(){
			assert.equal(isGood({err:"str"}),true);
		})
		it('sould be TRUE for: null',function(){
			assert.equal(isGood(null),true);
		})
		it('sould be FALSE for: undefined',function(){
			assert.equal(isGood(),false);
		})
	})
})
// is result or ParseError
function notFatal(r){
	return (typeof r === 'object' && r!==null) ? r.err!='fatal' : r!==undefined ;
}
exports.notFatal = notFatal;
function isFatal(r) { return !notFatal(r); }
exports.isFatal = isFatal;
test.add_test('/meta_parser','notFatal',(path)=>{
	describe(path,function(){
		it('sould be TRUE for: number 0',function(){
			assert.equal(notFatal(0),true);
		})
		it('sould be TRUE for: number 2',function(){
			assert.equal(notFatal(2),true);
		})
		it('sould be TRUE for: empty string',function(){
			assert.equal(notFatal(''),true);
		})
		it('sould be TRUE for: not empty string',function(){
			assert.equal(notFatal('123'),true);
		})
		it('sould be TRUE for: {}',function(){
			assert.equal(notFatal({}),true);
		})
		it('sould be TRUE for: {err:0}',function(){
			assert.equal(notFatal({err:0}),true);
		})
		it('sould be TRUE for: {err:1}',function(){
			assert.equal(notFatal({err:1}),true);
		})
		it('sould be TRUE for: {err:2}',function(){
			assert.equal(notFatal({err:2}),true);
		})
		it("sould be TRUE for: {err:'parse'}",function(){
			assert.equal(notFatal({err:'parse'}),true);
		})
		it("sould be FALSE for: {err:'fatal'}",function(){
			assert.equal(notFatal({err:'fatal'}),false);
		})
		it('sould be TRUE for: {err:"str"}',function(){
			assert.equal(notFatal({err:"str"}),true);
		})
		it('sould be TRUE for: null',function(){
			assert.equal(notFatal(null),true);
		})
		it('sould be FALSE for: undefined',function(){
			assert.equal(notFatal(),false);
		})
	})
})

function messageAdder(message) {
	function addErrMessage(x,r){
		console.assert(!isGood(r) && r!==undefined);
		if(r.what=='')
			r.what+=message;
		else
			if(isFatal(r))
				return new FatalError(x,message,r);
			else
				return new ParseError(x,message,r);
		return r;
	}
}
exports.messageAdder = messageAdder;
function fatalCollect(x,arr) { return new FatalError(x,'',arr)}
exports.fatalCollect = fatalCollect;
function parseCollect(x,arr) { return new ParseError(x,'',arr)}
exports.parseCollect = parseCollect;

function push_err(errs,r) { // это legacy код
/*	// это перемещено в error_prepare
	if(r.what=='')
		for(var i=0; i<r.why.length; i++)
			errs.push(r.why[i]);
	else
*/
	errs.push(r);
}

function error_prepare(err) {
	function cut_parse(r) {
		if(!isFatal(r)) return null;
		if(!(r.why instanceof Array)) return null;
		var res = [];
		while(!isFatal(r.why[0]) && !isGood(r.why[0]))
			res.push(r.why.shift());
		if(r.why.length>0) {
			var x = cut_parse(r.why[r.why.length-1])
			if(x!==null)
				res.push(x);
		}
		if(res.length>1)
			return new ParseError(r.where,r.what,res);
		else if(res.length==1)
			return new ParseError(r.where,r.what,res[0]);
		else
			return null;
	}

	function isError(r) { return r instanceof ParseError || r instanceof FatalError; }
	function splice_void(r,push_method) {
		if(!isError(r)) return r;
		if(r.why instanceof Array) {
			var res = [];
			for(var i=0; i<r.why.length; i++) {
				var cur = splice_void(r.why[i],push_method);
				if(isError(cur) && cur.what==='')
					if(cur.why instanceof Array)
						if(isFatal(cur) && 
						cur.why.length>0 && isError(cur.why[0]) && !isFatal(cur.why[0]))
							push_method(res,cur);
						else
							for(var j=0; j<cur.why.length; j++)
								push_method(res,cur.why[j]);
					else
						push_method(res,cur.why);
				else res.push(cur);
			}
			if(res.length==1)
				r.why = res[0];
			else
				r.why = res;
		}
		else if(isError(r.why))
			if(r.why.what==='')
				r.why = splice_void(r.why,push_method).why;
			else
				r.why = splice_void(r.why,push_method);
		return r;
	}

	function simplify(err) {
		if(isError(err) && err.what==='')
			if(err.why instanceof Array)
				if(err.why.length===1)
					return err.why[0]
				else return err;
			else
				return err.why;
		else return err;
	}
	if(err instanceof FatalError) {
		//извлекает из последних фаталов парс-эрроры
		var parses = cut_parse(err);
		//безымянные FatalError-ы вклеивает в родительские и сортирует по убыванию позиции
		err = simplify(splice_void(err, (arr,x)=>{
			if(isFatal(x)) {
				for(var i=arr.length-1; i>=0 && isFatal(arr[i]) && arr[i].where<x.where; i--)
					;
				i++
				arr.splice(i,0,x)
			}
			else
				arr.unshift(x)
		}))
		
		if(parses!==null) {
			//безымянные ParsError-ы вклеивает в родительские
			parses = simplify(splice_void(parses, (arr,x)=>{arr.push(x)} ));
			if(isError(parses) && parses.what==='' && parses.why instanceof Array) {
				parses.why.push(err);
				return fatalCollect(parses.where,parses.why)
			}
			else
				return fatalCollect(parses.where,[parses,err])
		}
		else
			return err;
	}
	else if(err instanceof ParseError)
		return simplify(splice_void(err, (arr,x)=>{arr.push(x)} ))
	else
		return err;
}
exports.error_prepare = error_prepare;
test.add_test('/meta_parser','error_prepare',(path)=>{
	describe('error_prepare, основное',function(){
/*
	p 7 'x'
	f 2 []
	------
	parse
		p 'x' -> p 'x'
		p [ p 'x' ] -> p 'x'
		p [ p 'x', p 'y' ] -> p [ p 'x', p 'y' ]
		p [ p [ p 'x', p 'y' ], p 'z'] -> p [ p 'x', p 'y', p 'z']
		p [ p [ p 'x' ] ] -> p 'x'
	fatal
		f 'x' -> f 'x'
		f [ f 'x' ] -> f 'x'
		f [ f 'x', f 'y' ] -> f [ f 'x', f 'y' ]
		f [ f [ f 'x', f 'y' ], f 'z'] -> f [ f 'x', f 'y', f 'z']
		f [ f [ f 'x' ] ] -> f 'x'
	cut parse
		f [ p 'x', p 'y', f [p 'a', p 'b', f 'm'], f [ p 'c', p 'd', f 'n']] ->
			f [ p 'x', p 'y', p 'c', p 'd', f [ f [p 'a', p 'b', f 'm'], f 'n']]
*/		
		function p(a,x) {
			x = x || 0;
			if(a instanceof Array) return parseCollect(x,a);
			else return new ParseError(x,a)
		}
		function f(a,x) {
			x = x || 0;
			if(a instanceof Array) return fatalCollect(x,a);
			else return new FatalError(x,a)
		}
		describe('parse',()=>{
			it("p 'x' -> p 'x'",()=>{
				assertPrepareDeepEqual(p('x'),p('x'))
			})
			it("p [ p 'x' ] -> p 'x'",()=>{
				assertPrepareDeepEqual(p([p('x')]),p('x'))
			})
			it("p [ p 'x', p 'y' ] -> p [ p 'x', p 'y' ]",()=>{
				assertPrepareDeepEqual(p([p('x'),p('y')]),p([p('x'),p('y')]))
			})
			it("p [ p [ p 'x', p 'y' ], p 'z'] -> p [ p 'x', p 'y', p 'z']",()=>{
				assertPrepareDeepEqual(p([p([p('x'), p('y')]), p('z')]),p([ p('x'), p('y'), p('z')]))
			})
			it("p [ p [ p 'x' ] ] -> p 'x'",()=>{
				assertPrepareDeepEqual(p([ p([ p('x')])]), p('x'))
			})
		})
		describe('fatal',()=>{
			it("f 'x' -> f 'x'",()=>{
				assertPrepareDeepEqual(f('x'),f('x'))
			})
			it("f [ f 'x' ] -> f 'x'",()=>{
				assertPrepareDeepEqual(f([f('x')]),f('x'))
			})
			it("f [ f 'x', f 'y' ] -> f [ f 'x', f 'y' ]",()=>{
				assertPrepareDeepEqual(f([f('x'),f('y')]),f([f('x'),f('y')]))
			})
			it("f [ f [ f 'x', f 'y' ], f 'z'] -> f [ f 'x', f 'y', f 'z']",()=>{
				assertPrepareDeepEqual(f([f([f('x'), f('y')]), f('z')]),f([ f('x'), f('y'), f('z')]))
			})
			it("f [ f [ f 'x' ] ] -> f 'x'",()=>{
				assertPrepareDeepEqual(f([ f([ f('x')])]), f('x'))
			})
		})
		describe('cut parse',()=>{
			it("f [ p 'x', p 'y', f [p 'a', p 'b', f 'm'], f [ p 'c', p 'd', f 'n']] ->\
 f [ p 'x', p 'y', p 'c', p 'd', f [ f [p 'a', p 'b', f 'm'], f 'n']]",()=>{
				assertPrepareDeepEqual(
					f([ p('x'), p('y'), f([p('a'), p('b'), f('m')]), f([ p('c'), p('d'), f('n')])]),
					f([ p('x'), p('y'), p('c'), p('d'), f([ f([p('a'), p('b'), f('m')]), f('n')])])
				)
			})
		})
	})
})

//}
//{ === ОСНОВА ===
/*
всвязи с особенностями работы LL-парсеров возможна такая ситуация, когда
последний необязательный элемент был неудачно прочитан, 
но поскольку он необязательный - это не ошибка
но поскольку он последний, после него не пытаются распарсится другие паттерны
а просто остаются неразобранные символы.
При этом информация о последней ошибке (последних ошибках) отсутствует.

Стоит отметить, что это касается только фатальных ошибок.

как это работает:
каждая функция вначале запоминает tail_error локально, а глобально - обнуляет.
rep и opt  могут туда что-то добавить.
когда произошла фатальная ошибка или 
		ничего не прочитано (это если например последовательно идет opt(),opt() )
	локальный (т.е. предыдущий глобальный) и текущий глобальный tail_error-ы - объединяются
	и становятся значением tail_error
иначе taile_error остается текущим глобальным
*/
var tail_error = []; // GLOBAL VARIABLE for tail error
// var parser_debug; // GLOBAL VARIABLE for debug

//строка должна соответствовать паттерну от начала и до конца
//иначе tail_error
function read_all(str, pos, pattern) {
	tail_error = [];
	pos = {x:0}//и далее передаем всегда по ссылке
	var r = pattern(str,pos);
	if(isGood(r)) {
		if(pos.x == str.length)
			return r;
		else
			return fatalCollect(pos.x,tail_error);
	}
	else if(isFatal(r) && tail_error.length!==0) {
		push_err(tail_error,r);
		var where = 0;
		for(var i=0; i<tail_error.length; i++)
			if(tail_error[i].where > where)
				where = tail_error[i].where;
		return fatalCollect(where,tail_error)
	}
	else {
		if(r===undefined)
			return err_unknown(pos.x)
		else
			return r;
	}
}
exports.read_all = read_all

// основной конструктор
function Pattern(exec) {
	
	// если pos не передан, то строка должна соответствовать паттерну от начала и до конца
	this.exec = function pattern_exec(str, pos/*.x*/){
		if(pos === undefined) return read_all(str,pos,exec);
		else {
			var lte = tail_error; // local tail_error
			tail_error = [];
			var local_pos = pos.x;
			var err =  exec(str,pos);
			if(lte.length!==0 && (local_pos === pos.x || isFatal(err))) {
				if(tail_error.length!==0)
					for (var i = 0; i < tail_error.length; i++) {
						lte.push(tail_error[i]);
					}
				tail_error = lte;
			}
			return err;
		}
	};
	// если результат - то transform, иначе - error_transform
	// можно преобразовать результат в ошибку и наоборот
	this.then = function pattern_then(transform/*(r,x)*/,error_transform/*(x,r)*/) {
		if(error_transform){
			console.assert(typeof error_transform === 'function')
			if(typeof transform === 'function')
				return new Pattern(function pattern_then_reserr(str,pos/*.x*/) {
					var x = pos.x;
					var r = exec(str, pos);
					if(!isGood(r)) {
						r = error_transform(x,r);
						delete r.res;
						return r;
					}
					else
						return transform(r,x);
				});
			else
				return new Pattern(function pattern_then_err(str,pos/*.x*/) {
					var x = pos.x;
					var r = exec(str, pos);
					if(!isGood(r)) {
						r = error_transform(x,r);
						delete r.res;
						return r;
					}
					else
						return r;
				});
		}
		else if(typeof transform === 'function')
			return new Pattern(function pattern_then_res(str, pos/*.x*/) {
				var x = pos.x;
				var r = exec(str, pos);
				return (!isGood(r)) ?
					(delete r.res, r) :
					transform(r,x);
			});
	}
	this.norm_err = function(){
		return new Pattern()
	}
}
exports.Pattern = Pattern;
// usage: var p = new Forward; /* some using p */; p.pattern = pattern(of(what,you,wantgs));
function Forward(){
	var self = this;
	this.exec = function forward_exec(){ return self.pattern.exec.apply(self.pattern,arguments); }
	this.then = function forward_then(transform/*(r,x)*/,error_transform/*(x,r)*/) {
		if(error_transform){
			console.assert(typeof error_transform === 'function')
			if(typeof transform === 'function')
				return new Pattern(function pattern_then_reserr(str,pos/*.x*/) {
					var x = pos.x;
					var r = exec(str, pos);
					if(!isGood(r)) {
						r = error_transform(x,r);
						delete r.res;
						return r;
					}
					else
						return transform(r,x);
				});
			else
				return new Pattern(function pattern_then_err(str,pos/*.x*/) {
					var x = pos.x;
					var r = exec(str, pos);
					if(!isGood(r)) {
						r = error_transform(x,r);
						delete r.res;
						return r;
					}
					else
						return r;
				});
		}
		else if(typeof transform === 'function')
			return new Pattern(function pattern_then_res(str, pos/*.x*/) {
				var x = pos.x;
				var r = exec(str, pos);
				return (!isGood(r)) ?
					(delete r.res, r) :
					transform(r,x);
			});
	}
}
exports.Forward = Forward;

//}
//{ === TXT ===

var err_txt = (x,text)=>new FatalError(x,'ожидалось \''+text+'\'');
exports.err_txt = err_txt;

// если текст читается - возвращает его, иначе ничего
function read_txt(str, pos, text) {
	if (str.substr(pos.x, text.length) == text)	{
		pos.x += text.length;
		return text;
	}
	return err_txt(pos.x,text);
}
exports.read_txt = read_txt;

function txt(text) {
	return new Pattern((str,pos)=>read_txt(str,pos,text));
}
exports.txt = txt;

//}
//{ === RGX ===

var err_rgx = (x,text)=>new FatalError(x,'text not match regexp /'+text+'/');
exports.err_rgx = err_rgx;

// если regexp читается (не забываем в начале ставить ^)
//- возвращает массив разбора ([0] - вся строка, [1]... - соответствуют скобкам из regexp)
//, иначе ничего
function read_rgx(str, pos, regexp) {
	var m;
	if (m = regexp.exec(str.slice(pos.x))){
		pos.x += m.index + m[0].length;
		return m
	}
	return err_rgx(pos.x,regexp.source)
}
exports.read_rgx = read_rgx;

//если в начале regexp не стоит ^, то она будет поставлена автомамтически
function rgx(regexp) {
	console.assert(regexp instanceof RegExp, 'в rgx передан аргумент неправильного типа');
	if(!/^\^/.test(regexp.source)){
		//console.warn('добавляю ^ в начало рег.выр-я '+regexp.source);
		regexp = new RegExp('^'+regexp.source);
	}
	return new Pattern((str,pos)=>read_rgx(str,pos,regexp));
}
exports.rgx = rgx;

//}
//{ === OPT ===

// фатальную ошибку или ничего преобразует в неошибку
// позицию восстанавливает, если ошибка
function read_opt(str, pos, pattern, def={err:0}/*не ошибка*/) {
	var x = pos.x;
	var r = pattern(str, pos)
	if(isFatal(r))	{
		pos.x=x;
		push_err(tail_error,r);
		return def;
	}
	return r;
}
exports.read_opt = read_opt;

function opt(pattern,def={err:0}) {
	return new Pattern((str,pos)=>read_opt(str,pos,pattern.exec,def));
}
exports.opt = opt;

//}
//{ === SEQ ===

// читает последовательность, в случае неудачи позицию НЕ восстанавливает
function read_seq(str, pos, needed, patterns) {
	var res = [], errs = [];
	var x = pos.x;
	for(var i=0; i<patterns.length; i++) {
		var r = patterns[i](str,pos);
		if(isFatal(r)) {
			if(errs.length>0){
				push_err(errs,r);
				return fatalCollect(x,errs);
			}
			else
				return r;
		}
		else {
			if(needed.indexOf(i)!=-1)
				res.push(r);
			if(!isGood(r))
				push_err(errs,r);
		}
	}
	if(errs.length>0)
		return parseCollect(x,errs,res);
	else
		if(res.length==1)
			return res[0];
		else
			return res;
}
exports.read_seq = read_seq;

// читает последовательность, в случае неудачи позицию НЕ восстанавливает
function read_seqn(str, pos, needed, patterns) {
	var res = {}, errs = [];
	var x = pos.x;
	for(var i=0; i<patterns.length; i++) {
		var r = patterns[i](str,pos);
		if(isFatal(r)) {
			if(errs.length>0){
				push_err(errs,r);
				return fatalCollect(x,errs);
			}
			else
				return r;
		}
		else {
			if(needed[i]!==undefined)
				res[needed[i]]=r;
			if(!isGood(r))
				push_err(errs,r);
		}
	}
	if(errs.length>0)
		return parseCollect(x,errs,res);
	else
		return res;
}
exports.read_seq = read_seq;

function need_all(len) {
	var arr=[];
	for(var i=0; i<len; i++)
		arr.push(i);
	return arr;
}
exports.need_all = need_all;
function need(...nums) { return (len)=>nums; }
exports.need = need;
var need_none = [];
exports.need_none = need_none;

function seq(needed, ...patterns) {
	patterns = patterns.map(pattern=>pattern.exec);
	if(typeOf(needed)=='function') {
		needed = needed(patterns.length);
		return new Pattern((str,pos)=>read_seq(str,pos,needed,patterns));
	}
	if(typeOf(needed)=='object') {
		if(needed instanceof Array)
			return new Pattern((str,pos)=>read_seq(str,pos,needed,patterns));
		var nd=[];
		if(patterns.length===0){
			var i=0;
			for(var name in needed){
				if(!/^none/.test(name))
					nd[i]=name;
				patterns.push(needed[name].exec)
				i++;
			}
			return new Pattern((str,pos)=>read_seqn(str,pos,nd,patterns));
		}
		else {
			for(var name in needed)
				nd[needed[name]]=name;
		}
		return new Pattern((str,pos)=>read_seqn(str,pos,nd,patterns));
	}
}
exports.seq = seq;

test.add_test('/meta_parser','seq',(path)=>{
	describe('seq(`a` `b` `c`).exec("abc")',function(){
		it("need_all,... => ['a','b','c']",()=>{
			assert.deepEqual(seq(need_all,txt('a'),txt('b'),txt('c')).exec('abc'),['a','b','c'])
		})
		it("need(0,2),... => ['a','c']",()=>{
			assert.deepEqual(seq(need(0,2),txt('a'),txt('b'),txt('c')).exec('abc'),['a','c'])
		})
		it("[0,2],... => ['a','c']",()=>{
			assert.deepEqual(seq([0,2],txt('a'),txt('b'),txt('c')).exec('abc'),['a','c'])
		})
		it("need(1),... => 'b'",()=>{
			assert.deepEqual(seq(need(1),txt('a'),txt('b'),txt('c')).exec('abc'),'b')
		})
		it("[1],... => 'b'",()=>{
			assert.deepEqual(seq([1],txt('a'),txt('b'),txt('c')).exec('abc'),'b')
		})
		it('need_none,... => []',()=>{
			assert.deepEqual(seq(need_none,txt('a'),txt('b'),txt('c')).exec('abc'),[])
		})
		it("{first:0,third:2},... => {first:'a',third:'c'}",()=>{
			assert.deepEqual(seq({first:0,third:2},txt('a'),txt('b'),txt('c')).exec('abc'),{first:'a',third:'c'})
		})
		it("seq({first:txt('a'),none:txt('b'),third:txt('c')}) => {first:'a',third:'c'}",()=>{
			assert.deepEqual(seq({first:txt('a'),none:txt('b'),third:txt('c')}).exec('abc'),{first:'a',third:'c'})
		})
		it("{second:1},... => {second:'b'}",()=>{
			assert.deepEqual(seq({second:1},txt('a'),txt('b'),txt('c')).exec('abc'),{second:'b'})
		})
		it("seq({none1:txt('a'),second:txt('b'),none2:txt('c')}) => {second:'b'}",()=>{
			assert.deepEqual(seq({none1:txt('a'),second:txt('b'),none2:txt('c')}).exec('abc'),{second:'b'})
		})
	})
})
//}
//{ === REP ===

// в начале читает pattern, потом последовательность separated
// ответ - массив результатов паттернов
// от паттерна не требует восстанавливать позицию в случае неудачи (делает это сам)
function read_rep(str, pos, pattern, separated, min, max) {
	min = min===undefined ? 0 : min;
	max = max===undefined ? +Infinity : max;

	var res = [], errs = [], x = pos.x
	var i=0;
	for(;i<min; i++) {
		var r = i==0 ? pattern(str,pos) : separated(str,pos);
		if(isFatal(r)) {
			if(errs.length>0){
				push_err(errs,r);
				return fatalCollect(x,errs);
			}
			else
				return r;
		}
		else {
			res.push(r);
			if(!isGood(r))
				push_err(errs,r);
		}
	}
	for(;i<max; i++) {
		x = pos.x;
		var r = i==0 ? pattern(str,pos) : separated(str,pos);
		if(isFatal(r)) {
			pos.x = x;
			push_err(tail_error,r);
			return res;
		}
		else {
			res.push(r);
			if(!isGood(r))
				push_err(errs,r);
		}
	}
	if(errs.length>0)
		return parseCollect(x,errs,res);
	else
		return res;
}
exports.read_rep = read_rep;

// читает последовательность паттернов, разделенных сепаратором
// если указан then - с его помощью обрабатываются пары seq(need(), separator, pattern)
// options = {min,max}
function rep(pattern, options, separator, then) {
	var min = options && options.min || 0;
	var max = options && options.max || +Infinity;
	console.assert(0<=min && min<=max && 1<=max);
	var separated = !separator ? pattern :
		then ? seq(need_all, separator, pattern).then(then) :
		seq(need(1), separator, pattern);

	return new Pattern((str,pos)=>read_rep(str,pos,pattern.exec,separated.exec,min,max));
}
exports.rep = rep;

var star = {min:0,max:Infinity};
exports.star = star;

//}
//{ === ANY ===

// перебирает паттерны с одной и той же позиции до достижения удачного результата
function read_any(str, pos/*.x*/, patterns) {
	var x = pos.x;
	var errs = [];
	for (var i = 0; i < patterns.length; i++){
		pos.x = x;
		var r = patterns[i](str, pos)
		if( !isFatal(r) )
			return r;
		else
			push_err(errs,r);
	}
	return fatalCollect(x,errs);
}
exports.read_any = read_any;

function any(...patterns) {
	if(patterns.length===1 && typeOf(patterns[0])=='array')
		patterns = patterns[0];
	patterns = patterns.map(pattern=>pattern.exec);
	return new Pattern((str,pos)=>read_any(str,pos,patterns));
}
exports.any = any;

//}
//{ === EXC ===
var err_exc = (x)=>new FatalError(x,'неожиданная конструкция');
exports.err_exc = err_exc;

function exc(except, pattern) {
	return new Pattern(function exc_pattern(str, pos/*.x*/) {
		var x = pos.x;
		if(isGood(except.exec(str, pos)))
			return err_exc(x);
		pos.x = x;
		return pattern.exec(str, pos);
	});
}
exports.exc = exc;
//}
} // function main
	try{
		if(loaded_modules) { // it is not node.js
			module = new Module();
			main(module, module.exports, require);
			loaded_modules["meta_parser"] = module.exports; 
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
