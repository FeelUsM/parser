// требует utils
;(function(){
function main(module, exports, require) {
"use strict";

var test = require('parser_test_utils');
test.add_category('/','meta parser','');

//мы поняли то что прочитали, но это не то, что мы хотим
// в этом случае обработка прекращается (т.к. вместо результата ParseError), а парсинг (последовательностей) продолжается
// это влияет на any так: если синтаксически удалось разобрать 2 варианта, и в одном из них произошла логическая ошибка, 
//    то логично использовать разобранный вариант, где нет ошибок
//    но на практике это встречается редко
// на последовательность разбора seq и rep это не влияет, но они создают 
//	  new ParseError(where/*старт*/,[полученных ошибок],обычный результат)
// в обработчиках then ParseError поступает на обычный обработчик
function ParseError(where,what,res){
	console.assert(typeof where == 'number','in ParseError where ('+where+') is not a number')
	this.err = 1
	this.what = what; // если what - массив, то where не имеет смысла
	this.where = where;
	this.res = res; // не обязательный
}
//мы не поняли, что прочитали
function FatalError(where,what,why){
	console.assert(typeof where == 'number','in ParseError where ('+where+') is not a number')
	this.err = 2
	this.what = what; // если what - массив, то where не имеет смысла
	this.where = where;
	this.why = why;
}
var tail_error = []; // GLOBAL VARIABLE for tail error
// var parser_debug; // GLOBAL VARIABLE for debug

// is result
function isGood(r){
	return (typeof r === 'object' && r!==null) ? !r.err : r!==undefined ;
}
test.add_test('/meta parser','isGood',(path)=>{
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
		it('sould be FALSE for: {err:1}',function(){
			assert.equal(isGood({err:1}),false);
		})
		it('sould be FALSE for: {err:2}',function(){
			assert.equal(isGood({err:2}),false);
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
	return (typeof r === 'object' && r!==null) ? r.err===undefined || r.err<2 : r!==undefined ;
}
function isFatal(r) { return !notFatal(r); }
test.add_test('/meta parser','notFatal',(path)=>{
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
		it('sould be FALSE for: {err:2}',function(){
			assert.equal(notFatal({err:2}),false);
		})
		it('sould be TRUE for: null',function(){
			assert.equal(notFatal(null),true);
		})
		it('sould be FALSE for: undefined',function(){
			assert.equal(notFatal(),false);
		})
	})
})

function addErrMessage(r,message){
	if(!isGood(r) && r!==undefined) r.what+=message;
	return r;
}

var err_tail = (x,why)=>new FatalError(x,'в тексте присутствует одна из ошибок:',why);
exports.err_tail = err_tail;
var err_unknown = (x)=>new FatalError(x,'unknown error');
exports.err_unknown = err_unknown;

//строка должна соответствовать паттерну от начала и до конца
//иначе ParseError(pos.x,'остались неразобранные символы',r)
function read_all(str, pos, pattern) {
	tail_error = [];
	pos = {x:0}//и далее передаем всегда по ссылке
	var r = pattern(str,pos);
	if(isGood(r)) {
		if(pos.x == str.length)
			return r;
		else
			return err_tail(pos.x,tail_error);
	}
	else if(tail_error.length!==0 && isFatal(r)) {
		tail_error.push(r);
		var where = 0;
		for(var i=0; i<tail_error.length; i++)
			if(tail_error[i].where > where)
				where = tail_error[i].where;
		return err_tail(where,tail_error)
	}
	else {
		if(r===undefined)
			return err_unknown(pos.x)
		else
			return r;
	}
}

var err_filtered = (x,why)=>new FatalError(x,'отфильтрованные ошибки:',why);
exports.err_filtered = err_filtered;

function error_prepare(r) {
	if(notFatal(r) || r.why===undefined) return r;
	if(false){//r.what==='unparsed chars are remained' || r.what==='в тексте присутствует одна из ошибок:') {
		return new FatalError(r.where,r.what,r.why.map(r=>new FatalError(r.where,r.what)))
		// r.why.forEach(r=>{delete r.why});
		return r;
	}

	var accum = err_filtered(r.where,[]);
	var path = [];
	function for_why(r) {
		if(Array.isArray(r.why)) {
			path.push(r);
			r.why.forEach(for_why)
			path.pop();
		}
		else if(r.why!==undefined && isFatal(r.why)) {
			path.push(r);
			for_why(r.why);
			path.pop();
		}
		else {
			/*
			r.why = path.map(x=>new FatalError(x.where,x.what)).filter(x=>
				x.what!=='произошли следующие ошибки: ' &&
				x.what!=='не удалось прочитать ни одну из альтернатив' &&
				x.what!=='unparsed chars are remained'
			).reverse();
			*/
			accum.why.push(r);
		}
	}
	for_why(r);
	accum.why.sort((l,r)=>r.where-l.where);
	//accum.why = accum.why.filter(x=>x.where==accum.why[0].where)
	accum.where = accum.why[0].where
	return accum;
}
exports.error_prepare = error_prepare;

// основной конструктор
function Pattern(exec) {
	
	// если pos не передан, то строка должна соответствовать паттерну от начала и до конца
	// иначе ParseError(pos.x,'остались неразобранные символы',r)
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
					return (isFatal(r)) ?
						error_transform(x,r) :
						transform(r,x);
				});
			else
				return new Pattern(function pattern_then_err(str,pos/*.x*/) {
					var x = pos.x;
					var r = exec(str, pos);
					return (isFatal(r)) ?
						error_transform(x,r) :
						r;
				});
		}
		else if(typeof transform === 'function')
			return new Pattern(function pattern_then_res(str, pos/*.x*/) {
				var x = pos.x;
				var r = exec(str, pos);
				return (isFatal(r)) ?
					r :
					transform(r,x);
			});
	}
	this.norm_err = function(){
		return new Pattern()
	}
}
// usage: var p = new Forward; /* some using p */; p.pattern = pattern(of(what,you,wantgs));
function Forward(){
	var self = this;
	this.exec = function forward_exec(){	return self.pattern.exec.apply(self.pattern,arguments);	}
	this.then = function forward_then(){	return self.pattern.then.apply(self.pattern,arguments);	}
}

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
function txt(text) {
	return new Pattern((str,pos)=>read_txt(str,pos,text));
}

var err_rgx = (x,text)=>new FatalError(x,'ожидалось /'+text+'/');
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
//если в начале regexp не стоит ^, то она будет поставлена автомамтически
function rgx(regexp) {
	console.assert(regexp instanceof RegExp, 'в rgx передан аргумент неправильного типа');
	if(!/^\^/.test(regexp.source)){
		//console.warn('добавляю ^ в начало рег.выр-я '+regexp.source);
		regexp = new RegExp('^'+regexp.source);
	}
	return new Pattern((str,pos)=>read_rgx(str,pos,regexp));
}

// ошибку или ничего преобразует в неошибку
// позицию восстанавливает, если ошибка
function read_opt(str, pos, pattern, def={err:0}/*не ошибка*/) {
	var x = pos.x;
	var r = pattern(str, pos)
	if(!isGood(r))	{
		pos.x=x;
		tail_error.push(r);
		return def;
	}
	return r;
}
function opt(pattern,def={err:0}) {
	return new Pattern((str,pos)=>read_opt(str,pos,pattern.exec,def));
}

// читает последовательность, в случае неудачи позицию НЕ восстанавливает
// если ParseError - чтение продолжается, если FatalError - чтение сразу завершается с FatalError, 
// и то же произойдет в последовательности предыдущего уровня
//от isFatal зависит, что будет включено в ответ
function read_seq(str, pos, isFatal, patterns) {
	var res = {a:[]}; // a - array
	for (var i = 0; i < patterns.length; i++) {
		var r = { res : patterns[i](str, pos) };
		if( isFatal(res,r,i,pos.x) )
			return r.res;
	}
	return res.a;
}
function seq(isFatal/*(res//.a//,r//.res//,i,pos)*/, ...patterns) {
	if(!isFatal.is_isFatal) throw new Error('вы забыли указать need в seq')
	return new Pattern((str,pos)=>read_seq(str,pos,isFatal,patterns.map(pattern=>pattern.exec)));
}

// какие результаты из последовательности паттернов включать в ответ
// в случае ParseError у результата устанавливает .err=1 и .what = массиву ошибок ParseError
// а также сам ParseError добавиться в массив и в массив ошибок
function need_all(res/*.a*/,r/*.res*/,i,pos) { // isFatal()
	if(isFatal(r.res))
		return true;
	if(!isGood(r.res)) {
		if(isGood(res.a))
			res.a = new ParseError(pos,[],res.a);
		res.a.what.push(r.res);
	}
	if(isGood(res.a))
		res.a.push(r.res);
	else
		res.a.res.push(r.res)

	return false;
}
need_all.is_isFatal = true;
// в случае ParseError у результата устанавливает .err=1 и .what = массиву ошибок ParseError
function need_none(res/*.a*/,r/*.res*/,i,pos){ // isFatal()
	if(!notFatal(r.res))
		return true;
	if(!isGood(r.res)) {
		if(isGood(res.a))
			res.a = new ParseError(pos,[],res.a);
		res.a.what.push(r.res);
	}
	return false;
}
need_none.is_isFatal = true;
function need(...indexes){
	// резултат - после прочтения одного паттерна
	// ответ - результат всего seq
	if(indexes.length == 0)
		// + ВСЕ одиночные результаты добавляет в ответ как в массив
		throw 'непонятно, что включать в ответ';
	if(indexes.length == 1) {
		// + единственный нужный результат становится ответом
		function need_one(res/*.a*/,r/*.res*/,i,pos){ // isFatal()
			if(!notFatal(r.res))
				return true;
			if(!isGood(r.res)) {
				if(isGood(res.a))
					res.a = new ParseError(pos,[],res.a);
				res.a.what.push(r.res);
			}
			if(i==indexes[0]) {
				if(isGood(res.a))
					res.a = r.res;
				else
					res.a.res = r.res;
			}
			return false;
		}
		need_one.is_isFatal = true;
		return need_one;
	}
	else {
		// + добавляет результаты в заданные позиции ответа
		function need_indexes(res/*.a*/,r/*.res*/,i,pos){ // isFatal()
			if(!notFatal(r.res))
				return true;
			if(!isGood(r.res)) {
				if(isGood(res.a))
					res.a = new ParseError(pos,[],res.a);
				res.a.what.push(r.res);
			}
			var k = indexes.indexOf(i);
			if(k!=-1) {
				if(isGood(res.a))
					res.a[k] = r.res;
				else
					res.a.res[k] = r.res;
			}
			return false;
		}
		need_indexes.is_isFatal = true;
		return need_indexes;
	}
}

// в начале читает pattern, потом последовательность separated
// ответ - массив результатов паттернов
// от паттерна не требует восстанавливать позицию в случае неудачи (делает это сам)
function read_rep(str, pos, pattern, separated, min, max) {
	min = min===undefined ? 0 : min;
	max = max===undefined ? +Infinity : max;

	var res = [], x = pos.x
	var i=0;
	for(;i<min; i++) {
		var r = i==0 ? pattern(str,pos) : separated(str,pos);
		if(isFatal(r)) return r;
		if(!isGood(r)) {
			if(isGood(res))
				res = new ParseError(x,[],res);
			res.what.push(r);
		}
		if(isGood(res))
			res.push(r);
		else
			res.res.push(r)
	}
	for(;i<max; i++) {
		x = pos.x;
		var r = i==0 ? pattern(str,pos) : separated(str,pos);
		if(isFatal(r)) {
			pos.x = x;
			tail_error.push(r);
			return res;
		}
		if(!isGood(r)) {
			if(isGood(res))
				res = new ParseError(x,[],res);
			res.what.push(r);
		}
		if(isGood(res))
			res.push(r);
		else
			res.res.push(r)
	}
	return res;
}
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
var star = {min:0,max:Infinity};

var err_any = (x,why)=>new FatalError(x,'alternatives:',why);
exports.err_any = err_any;

// перебирает паттерны с одной и той же позиции до достижения удачного результата
// от isGood зависит, будут ли собираться ошибки
function read_any(str, pos/*.x*/, isGood, patterns) {
	var x = pos.x;
	var errs = {a:err_any(pos.x,[])};
	for (var r, i = 0; i < patterns.length; i++){
		pos.x = x; // что бы у isGood была возможность выставить pos перед выходом из цикла
		r = patterns[i](str, pos)
		if( isGood(errs,r,i,pos) )
			return r;
	}
	return errs.a;
}
function any(isGood, ...patterns) {
	if(!isGood.is_isGood) throw new Error('вы забыли указать (not)collect в any');
	return new Pattern((str,pos)=>read_any(str,pos,isGood,patterns.map(pattern=>pattern.exec)));
}
//сначала надо указывать попытки удачного прочтения,
//а только потом попытки восстановления после ошибок

//неудачные результаты собирает в what как в массив
function collect(errs/*.a*/,r,i,pos/*.x*/){ // isGood
	if(isGood(r))  return true;
	if(!r)         return false;
	errs.a.why.push(r)//collect
	return false;
}
collect.is_isGood = true;

//ничего не собирает
function notCollect(errs/*.a*/,r,i,pos/*.x*/){//isGood
	return isGood(r);
}
notCollect.is_isGood = true;

// #todo как понадобится - доделать
function exc(pattern, except) {
	return new Pattern(function exc_pattern(str, pos/*.x*/) {
		return !isGood(except.exec(str, pos)) && pattern.exec(str, pos);
	});
}

exports.ParseError = ParseError;
exports.FatalError = FatalError;
exports.isGood = isGood;
exports.notFatal = notFatal;
exports.isFatal = isFatal;
exports.addErrMessage =  addErrMessage;
exports.read_all = read_all
exports.Pattern = Pattern;
exports.Forward = Forward;

exports.read_txt = read_txt;
exports.txt = txt;
exports.read_rgx = read_rgx;
exports.rgx = rgx;
exports.read_opt = read_opt;
exports.opt = opt;
exports.read_seq = read_seq;
exports.seq = seq;
exports.need_all = need_all;
exports.need_none = need_none;
exports.need = need;
exports.read_rep = read_rep;
exports.rep = rep;
exports.star = star;
exports.read_any = read_any;
exports.any = any;
exports.collect = collect;
exports.notCollect = notCollect;
//exports.exc = exc;

}
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
