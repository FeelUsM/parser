// требует utils
;(function(){
function main(module, exports, require) {
"use strict";

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

// is result or ParseError
function notFatal(r){
	return (typeof r === 'object' && r!==null) ? r.err===undefined || r.err<2 : r!==undefined ;
}
function isFatal(r) { return !notFatal(r); }

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
function need(...indexes){
	// резултат - после прочтения одного паттерна
	// ответ - результат всего seq
	if(indexes.length == 0)
		// + ВСЕ одиночные результаты добавляет в ответ как в массив
		throw 'непонятно, что включать в ответ';
	if(indexes.length == 1)
		// + единственный нужный результат становится ответом
		return function need_one(res/*.a*/,r/*.res*/,i,pos){ // isFatal()
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
	else
		// + добавляет результаты в заданные позиции ответа
		return function need_indexes(res/*.a*/,r/*.res*/,i,pos){ // isFatal()
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

//ничего не собирает
function notCollect(errs/*.a*/,r,i,pos/*.x*/){//isGood
	return isGood(r);
}

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

Error.prototype.toJSON = function(){ return {name:this.name,message:this.message} }
/*
придумать систему сообщений об ошибках
написать преобразователь из регексов и необработанных строк
реализовать sequence, char, quotedSequence
использовать в html-mocha-chai
дальше все остальное

ted._add(name,opts,regexp,fun)
ted._remove(name)
ted._main = name
ted._exec(str)
опции: 
	синтаксис больше похож на БНФ или на регулярки
	function toLowercase
*/

var err_spc = (x)=>new FatalError(x,'ожидался пробельный символ');
exports.err_spc = err_spc;

var err_num = (x)=>new FatalError(x,'ожидалось число');
exports.err_num = err_num;

var err_id = (x)=>new FatalError(x,'ожидался идентификатор');
exports.err_id = err_id;

// spc ::= "[\ \r\n\t\v\f]"
var spc = rgx(/^[\ \r\n\t\v\f]/).then(0,err_spc);
//exports.spc = spc;
// num ::= "[0-9]+"
var num = rgx(/^[0-9]+/).then(m=>+m[0],err_num);
// identifier ::= "[a-zA-Z_][a-zA-Z_0-9]*"
var identifier = rgx(/^[a-zA-Z_][a-zA-Z_0-9]*/).then(m=>m[0],err_id)

var err_qseq = (x)=>new FatalError(x,'ожидалась строка в обратных кавычках');
exports.err_qseq = err_qseq;

/*
quotedSequence ::= /`\`` ( [^\`] | `\\\``)* `\``/
// возвращает строку
*/
var quotedSequence = rgx(/^`(([^`\\]|\\\\|\\`)*)`/).then(
	m=>m[1].replace(/\\\\|\\`/g,(escseq)=>{
		var res = escseq==='\\\\' ? '\\' : '`';
		//console.log('escseq = '+escseq+' to '+ res);
		return res;
	}),
	err_qseq
);
exports.quotedSequence = quotedSequence;

var err_char = (x)=>new FatalError(x,'ожидался символ');
exports.err_char = err_char;

/*
рег: char ::= /[^\\\/\``|$.*+?()[]{}`] | `\\`./ // [\\\/\``|$.*+?()[]{}bfnrtv'"`] /
БНФ: char ::= /`\\`. / // здесь экранируется всё
// возвращает символ
*/
var reg_char = rgx(/^[^\\\/`\|\$\.\*\+\?\(\)\[\]\{\}]|\\./).then(
	m=>m[0].replace(/\\(.)/,'$1'),
	err_char
);
exports.reg_char = reg_char;
var bnf_char = rgx(/^\\(.)/).then(
	m=>m[1],
	err_char
);
exports.bnf_char = bnf_char;

var err_classChar = (x)=>new FatalError(x,'ожидался символ класса');
exports.err_classChar = err_classChar;

/*
рег: classChar ::= /[^\\\/\``^-|$.*+?()[]{}`] | `\\`. / // [\\\/\``^-|$.*+?()[]{}bfnrtv'"`]/ // отличие от char в ^ и -
БНФ: classChar ::= /[^\\\/\`` ^-|$.*+?()[]{}`] | `\\`. / // [\\\/\`` ^-|$.*+?()[]{}bfnrtv'"`]/ // здесь еще пробел экранируется
// возвращает символ
*/
var reg_classChar = rgx(/^[^\^\-\\\/`\|\$\.\*\+\?\(\)\[\]\{\}]|\\./).then(
	m=>m[0].replace(/\\(.)/,'$1'),
	err_classChar
);
exports.reg_classChar = reg_classChar;
var bnf_classChar = rgx(/^[^\^\-\\\/`\|\$\.\*\+\?\(\)\[\]\{\}\ ]|\\./).then(
	m=>m[0].replace(/\\(.)/,'$1'),
	err_classChar
);
exports.bnf_classChar = bnf_classChar;

var err_inClass = (x,why)=>new FatalError(x,'в классе',why);
exports.err_inClass = err_inClass;

/*
рег: class ::= "`[``^`?(classChar(`-`classChar)?|quotedSequence)*`]`|`.`"
БНФ: class ::= "`[``^`? spc* (classChar(`-`classChar)? spc*|quotedSequence spc*)*`]` | `.`"
// возвращает регексп (без галки вначале)
*/
var escaper = (s)=>{
	var r = s.replace(/([\^\-\ \\\/\|\$\.\*\+\?\(\)\[\]\{\}])/g,'\\$1');
	//console.log('replace: '+r);
	return r;
}
var merger = (arr)=>{
	var r = arr.join('');
	//console.log('merge: '+r);
	return r;
}
var reg_class = any(collect,
	txt('.'),
	seq(need_all, 
		txt('['), opt(txt('^'),''),
		rep(any(collect, 
			seq(need_all, 
				reg_classChar.then(escaper), opt(seq(need_all, txt('-'), reg_classChar.then(escaper)).then(merger),'')
			).then(merger),
			quotedSequence.then(escaper)
		),star).then(merger), 
		txt(']') 
	).then(merger)
).then(
	s=>new RegExp(s),
	err_inClass
);
exports.reg_class = reg_class;
var spcs = rep(spc,star).then(r=>'');
var bnf_class = any(collect,
	txt('.'),
	seq(need_all, 
		txt('['), opt(txt('^'),''), spcs, 
		rep(any(collect, 
			seq(need_all, 
				bnf_classChar.then(escaper), 
				opt(seq(need_all, txt('-'), bnf_classChar.then(escaper)).then(merger),''),
				spcs
			).then(merger),
			seq(need(0), quotedSequence.then(escaper), spcs)
		),star).then(merger), 
		txt(']') 
	).then(merger)
).then(
	s=>new RegExp(s),
	err_inClass
);
exports.bnf_class = bnf_class;


/*
balansedBrackets ::= "`(`([^`()`]|balansedBrackets)*`)`" 
рег: link ::= "`$`(identifier|`{`identifier balansedBrackets? `}`)"
БНФ: link ::= "`$`( identifier | `{` identifier balansedBrackets?`}` ) | identifier balansedBrackets?" // без пробелов
// возвращает ссылку на паттерн
*/

var reg_link = seq(need(1),txt('$'),
	any(collect,identifier,
		seq(need(1),txt('{'),identifier,txt('}')))
)

/*
symbol ::= "char|quotedSequence|class|link"
// возвращает строку или регексп или ссылку на паттерн
*/
var reg_symbol = any(collect,reg_char,quotedSequence,reg_class).then(0,err_char);
var bnf_symbol = any(collect,bnf_char,quotedSequence,bnf_class).then(0,err_char);

var err_quant = (x)=>new FatalError(x,'ожидался квантификатор');
exports.err_quant = err_quant;

/*
рег: quantificator ::= "[`*+?`]|`{`(num|num?`,`num?)`}`" // пока только энергичные
БНФ: quantificator ::= "[`*+?`]|`{`spc*(num|num?spc*`,`spc*num?)spc*`}`"
// возвращет объект {min:int,max:int}
*/
var reg_quantifier = any(collect,
	txt('*').then(()=>({min:0,max:Infinity})),
	txt('+').then(()=>({min:1,max:Infinity})),
	txt('?').then(()=>({min:0,max:1})),
	seq(need(1),txt('{'),
		any(collect,
			seq(need(1),txt(','),num).then(n=>({min:0,max:n})),
			seq(need_all,
				num,
				opt(seq(need(1),
					txt(','),
					opt(num,Infinity)
				))
			).then(arr=>({
				min:arr[0],max:typeof arr[1] === 'number' ? arr[1] : arr[0]
			}))
		)
	,txt('}'))
).then(0,err_quant);
exports.reg_quantifier = reg_quantifier;
var bnf_quantifier = any(collect,
	txt('*').then(()=>({min:0,max:Infinity})),
	txt('+').then(()=>({min:1,max:Infinity})),
	txt('?').then(()=>({min:0,max:1})),
	seq(need(2),txt('{'),spcs,
		any(collect,
			seq(need(2),txt(','),spcs,num).then(n=>({min:0,max:n})),
			seq(need_all,
				num,
				opt(seq(need(3),
					spcs,txt(','),
					spcs,opt(num,Infinity)
				))
			).then(arr=>({
				min:arr[0],max:typeof arr[1] === 'number' ? arr[1] : arr[0]
			}))
		),
	spcs,txt('}'))
).then(0,err_quant);
exports.bnf_quantifier = bnf_quantifier;


/*
modifier ::= "`?` ( `!` | \\` ([^\\`])* `\\`<` | identifier`->`)?"
namedModifier ::= "modifier | `?`identifier?`=`"
// возвращает объект {type: строка(not|postscript|back_pattern|returnname), data:строка или function(arg,global,stack)}
// если в тексте функции не встретилось return, оно добавляется перед все строкой
#todo добавить превращение в строку ?toString:

back_pattern - видимо это ссылка на паттерн, которая может быть установлена обработчиками при разборе предыдущих конструкций

обработчики все имеют аргументы (arg, pos), 
в качестве this - global_modifier_object - todo: сделать для каждого класса свой
error - означает, что обработчик вызовется для ошибки, и сможет изменить сообщение об ощибке.
возвращаемое значение является результатом или сообщением об ошибке.
кинутые исключения - записываются в modifier_throws и error_modifier_throws - todo: сделать для каждого класса свой
	а результат становится undefined, а если это обработка ошибки, то она не меняется
*/
var global_modifier_object = {};
function code_to_fun(code) {
	var fun;
	if(/^\s*\{/.test(code) && /\}\s*$/.test(code))
		return (new Function('arg','pos',code)).bind(global_modifier_object);
	else
		return (new Function('arg','pos','return '+code)).bind(global_modifier_object);
}
var code_to_funer = m=>{ if(m.type==='postscript') m.data = code_to_fun(m.data); return m};
var string = any(collect,
	rgx(/^'([^'\\]|\\'|\\\\)*'/).then(m=>m[0]),
	rgx(/^"([^"\\]|\\"|\\\\)*"/).then(m=>m[0])
).then(0, x=>new FatalError(x,'не могу прочитать строку js'));
exports.string = string;
var object = new Forward();
object.pattern = seq( need_all, txt('{'),
	rep(any(collect,
		rgx(/^[^'"\{\}]/).then(m=>m[0]),
		string,
		object
	),star).then(merger),
	txt('}')
).then(merger);
exports.object = object;
var modifier = seq(need(1), txt('?'), any(collect,
	txt('!').then(r=>({type:'not'})),
	seq(need(0,1),
		any(collect,
			seq(need(1),txt('`'),
				rgx(/^[^`]*/).then(m=>({type:'postscript',data:m[0]})),
				txt('`')),
			object.then(s=>({type:'postscript',data:'{return '+s+'}'}))
		),
		opt(txt('error')).then(s=>s==='error'),
		txt('<')
	).then(([o,e])=>{o.error = e; return o;}),
	seq(need(0),identifier,txt('->')).then(s=>({type:'back_pattern',data:s})),   // на будущее
	seq(need(0),opt(identifier,''),txt('=')).then(s=>({type:'returnname',data:s})),
	txt('toString:').then(s=>({type:'toString'}))
)).then(code_to_funer,(x,e)=>new FatalError(x,'in modifier',e));
exports.modifier = modifier;

/* есть 3 типа "функций":
	последовательность (символов, "функций" и т.д.)
		может иметь идущие в начале модификаторы, каждый начинается с ?
	перечисление альтернатив-последовательностей (в скобках через |)
	цикл/массив - скобки с квантификатором
		также сам может иметь модификаторы, которые отделяются от 
		модификаторов первой последовательности звездочкой *
каждая функция или конкатенирующая или объектная
	это не имеет значения для перечисления
каждая функция 
	имеет тип cat или obj
	может иметь атрибут direct
=== определение типа функции, и какой она является ===
	выражения без скобок имеют тип 'cat' и не имеют атрибута direct
	функция имеет тип obj, если у нее задано (возможно пустое) имя или она является объектной, 
		в противном случае она имеет тип cat
	но если функция* имеет модификатор ?toString: то она все равно имеет тип cat
	если в функции* имеется модификатор ?!(не), то она всегда имеет тип cat, 
		и всегда возвращает пустую строку в случае НЕудачного завершения
	фунякция является объектной, если хотябы одна из функций, которую она вызывает, 
		имеет тип obj, иначе функция является конкатенирующей
	но если последовательность состоит только из вызова ссылки на паттерн, и при этом указано (возможно пустое) имя
		то последовательность все равно является объектной

	объектная функция* может иметь обработчики только если имеет (возможно пустое) имя

	функции*, у которых задано пустое имя имеют атрибут direct
	перечисление имеет атрибут direct, если хотябы одна из альтернатив имеет атрибут direct
	если функция* вызывает хотябы одну функцию, которая direct
		то она обязана иметь (возможно пустое) имя
	если цикл является объектным, он обязан иметь (возможно пустое) имя
=== как функции получают результат ===
	конкатенирующие функции* передают-получают результаты по ссылке и конкатенируют их 
		(предварительно приведя к строке JSON, если это не строка)
	объектные функции* передают свой объект для модификации только в объектные функции, 
		а в конкатенирующие - фейковый объект, который не используется
	объектные циклы на каждой итерации создают и передают объект для модификации
		после чего добавляют его в свой массив, который является результирующим объектом
=== как функции возвращают результат ===
	функции* у которых задано непустое имя при успешном завершении
		у переданного им объекта создают свойство с этим именем
		и присвивают туда свой объект** или строку**
	функции* у которых задано пустое имя при успешном завершении
		заменяют переданный им объект своим объектом** или строкой**
	конкатенирующие функции* у которых не задано имя при успешном завершении
		заменяют переданный им объект своей строкой**
	объектные функции* у которых не задано имя при успешном завершении
		копируют все свойства своего объекта(тут нет сноски, это именно объект) в переданный им объект
	* - последовательности и циклы
	** - перед возвращением модификатор-обработчик может превратить
		объект или строку в значение любого типа
	перечисления передают переданный им объект на прямую в каждую альтернативу-перечисление
*/

var parser_tail_error = [];
var modifier_throws = [];
var error_modifier_throws = [];
/*
исключения обработчиков ошибок (фатальных) ловим, а ошибка не меняется
	накапливаем:
		само исключение what:
		ошибку-аргумент why:
		позицию обработчика в коде from:
*/
function modify_error(error_modifiers,err,begin) {
	for(var i=0; i<error_modifiers.length; i++) {
		var tmp
		try {
			tmp = error_modifiers[i].data(err,begin)
		}
		catch(e) {
			error_modifier_throws.push({
				what:e,
				why:err,
				from:error_modifiers[i].pos
			})
			continue;
		}
		err = tmp;
	}
	return err
}
/*
исключения обработчиков результатов ловим, а результат становится undefined
	накапливаем:
		само исключение what:
		начало и конец последовательности или цикла в тексте where:{begin:end:}
		позицию обработчика в коде from:
*/
function modify_result(modifiers,res,begin,end) {
	for(var i=modifiers.length-1; i>=0; i--) {
		try {
			res = modifiers[i].data(res,begin)
		}
		catch(e) {
			modifier_throws.push({
				what:e,
				where:{begin,end},
				from:modifiers[i].pos
			})
			res = undefined;
		}
	}
	return res;
}

var err_in = (x, why, what)=>new FatalError(x,'in '+what,why)
var err_uncycle = (x,i,name)=>new FatalError(x,'защита от зацикливания '+name+': на итерации '+i+' было прочитано 0 символов');
var err_not_fail = (x,name)=> new FatalError(x,'удалось прочитать то, что не должно быть прочитано: '+name)
exports.err_not_fail = err_not_fail;
var perr_c_name = x=>new ParseError(x,'объектный цикл должен иметь (возможно пустое) имя')
var err_seq_c_modifiers = x=>new PaarseError(x,'модификаторы цикла можно задавать только к циклу');
var perr_dublicate = (x,name)=>new ParseError(x,'повторно указано: '+name);
var perr_cycle_bp = x=>new ParseError(x,'цикл не может содержать back_pattern');

/*
рег: sequence ::= "modifier* (symbol quantificator? | `(`alternatives`)` quantificator? )*" 
БНФ: sequence ::= "(modifier )* spc* (symbol quantificator? spc* | `(` alternatives spc* `)` quantificator? spc* )*"
*/
function minmaxToRegExp({min,max}) {
	if(min==0 && max==1)
		return '?';
	else if(min==0 && max==Infinity) {
		return '*'
	}
	else if(min==1 && max==Infinity) {
		return '+'
	}
	else if(max==Infinity) {
		return '{'+min+',}'
	}
	else if(min==max) {
		return '{'+min+'}'
	}
	else
		return '{'+min+','+max+'}'
}
var reg_alternatives = new Forward();
var pos_adder = (m,x)=>{m.pos = x; return m;};
var reg_sequence = seq(need_all,
	rep(modifier/*.then(code_to_funer)*/.then(pos_adder)), // модификаторы
	rep(any(collect, // паттерны
		seq(need_all,
			reg_symbol,
			opt(reg_quantifier,null)
		).then(([symbol,quant],x)=>({type:'symbol',symbol,quant,pos:x})),
		seq(need(1,2,4),
			txt('('),
			opt(seq(need(0),rep(modifier.then(pos_adder)),txt('*')),[]),//.then(ms=>ms.map(code_to_funer)),
			reg_alternatives,
			txt(')'),
			opt(reg_quantifier,null)
		).then(([cycle_modifiers,{mode,fun,direct},quant],x)=>
			quant ? {type:'cycle',quant,cycle_modifiers,mode,fun,direct,pos:x} :
			cycle_modifiers.length>0 ? err_seq_c_modifiers(x) :
			{type:'pattern',mode,fun,direct,pos:x}),
		reg_link.then((s,x)=>({type:'link',link:s,pos:x}))
	))
).then(([modifiers,patterns],pattern_x)=>{
	var modifiers_schema = {
		id:"modifiers_schema",
		type:'array',
		items:{
			type:'object',
			additionalProperties:false,
			requiredProperties:{
				pos:{type:'integer'}
			},
			oneOfPropSchemas:[
				{requiredProperties:{
					type:{ enum:['postscript'] }, // ?`code`error< ?`code`<
					data:{ type:'Function' },
					error:{ type:'boolean' }
				}},
				{requiredProperties:{
					type:{ enum:['returnname'] }, // ?name= ?=
					data:{ oneOf:[{format:'identifier' },{enum:['']}]}
				}},
				{requiredProperties:{
					type:{ enum:['back_pattern'] }, // ?name->
					data:{ format:'identifier' }
				}},
				{requiredProperties:{
					type:{ enum:['not'] } // ?!
				}},
				{requiredProperties:{
					type:{ enum:['toString'] } // ?toString:
				}}
			]
		}
	};
	var patterns_schema = {
		id:'patterns_schema',
		definitions:{ quantificator:{
			id:'quantificator',
			type:['null','object'],
			requiredProperties:{
				min:{ type:'integer' },
				max:{ type:'integer' }
			},
			additionalProperties:false,
		}},
		type:'array',
		items:{
			type:'object',
			additionalProperties:false,
			requiredProperties:{
				pos:{ type:'integer' }
			},
			oneOfPropSchemas:[
				{requiredProperties:{
					type:{ enum:['symbol'] },
					symbol:{ type:['string','RegExp'] },
					quant:{ $ref:'#quantificator'}
				}},
				{allOfPropSchemas:[
					{requiredProperties:{
						type:{ enum:['pattern'] }
					}},
					{$ref:'#fun_schema'}
				]},
				{allOfPropSchemas:[
					{requiredProperties:{
						type:{ enum:['cycle'] },
						quant:{ $ref:'#quantificator'},
						cycle_modifiers:{ $ref:'modifiers_schema' }
					}},
					{$ref:'#fun_schema'}
				]},
				{requiredProperties:{
					type:{ enum:['link'] },
					link:{ type:'string' }
				}}
			]
		}
	};
	var fun_schema = {
		requiredProperties:{
			mode:{ enum:['cat','obj'] },
			fun:{ type:'Function' },
			direct:{
				type:'integer',
				minimum:-1
			}
		}
	}
	var return_schema = {
		type:'object',
		allOfPropSchemas:[
			{optionalProperties:{
				not:{ type:['boolean','undefined'] } //используется в alternatives
			}},
			{$ref:'#fun_schema'}
		],
		additionalProperties:false
	}

	/* последовательности
		** - перед возвращением модификатор-обработчик может превратить
			объект или строку в значение любого типа
	=== все последовательности ===
		последовательности у которых задано непустое имя при успешном завершении
			у переданного им объекта создают свойство с этим именем
			и присвивают туда свой объект** или строку**
		последовательности у которых задано пустое имя при успешном завершении
			заменяют переданный им объект своим объектом** или строкой**
	=== конкатенирующие последовательности ===
		конкатенирующие последовательности передают-получают результаты по ссылке и конкатенируют их 
			(предварительно приведя к строке JSON, если это не строка)
		конкатенирующие последовательности у которых не задано имя при успешном завершении
			заменяют переданный им объект своей строкой**
	=== объектные последовательности ===
		объектные последовательности передают свой объект для модификации только в объектные функции, 
			а в конкатенирующие - фейковый объект, который не используется
		объектные последовательности у которых не задано имя при успешном завершении
			копируют все свойства своего объекта(тут нет сноски, это именно объект) в переданный им объект
	*/
	function set_res_cat(res,inres_res,name) {
		if(typeof name === 'string') {
			if(name==='')
				res.res = inres_res;
			else
				res.res[name] = inres_res;
		}
		else if(name === null) {
			res.res = inres_res;
		}
		else throw new Error('неизвестный тип name')
	}
	function set_res_obj(res,inres_res,name) {
		if(typeof name === 'string') {
			if(name==='')
				res.res = inres_res;
			else
				res.res[name] = inres_res;
		}
		else if(name === null) {
			for(var i in inres_res)
				res.res[i] = inres_res[i]
		}
		else throw new Error('неизвестный тип name')
	}
	var make_not = (fun,name)=>function not_function(str,pos,res) {
		var x = pos.x;
		var r = fun(str,pos,res);
		pos.x = x;
		res.res = '';
		return !isGood(r) ? /*OK,but*/{err:"continue"} : err_not_fail(x,name); // всегда попадет в alternatives
	}

	/* всего 2 типа функций: конкатенирующие и объектные*/
	function cat_sequence(str,pos,res) { // name, compressed_patterns, modifiers, error_modifiers - closure
		var inres = [];
		var X = pos.x; // используется в сообщениях об ошибках
		for(var i=0; i<compressed_patterns.length; i++) {
			if(compressed_patterns[i] instanceof RegExp) {
				var m;
				if(m = compressed_patterns[i].exec(str.slice(pos.x))) {
					pos.x += m.index + m[0].length;
					inres.push(m[0]);
				}
				else
					return err_rgx(pos.x,compressed_patterns[i].source.slice(1))
			}
			else if(compressed_patterns[i].type==='pattern') {
				/* если не строка, то stringifyцируем, 
				   если FatalError - возвращаем FatalError+обработка ошибок
					+ если задано name - обернуть в новый FatalError и завершить
				*/
				if(compressed_patterns[i].mode!=='cat') throw new Error('происходит вызов объектного паттерна из конкатенирующего');
				var back_res = {};
				var err = compressed_patterns[i].fun(str,pos,back_res); // ВЫЗВАЛИ!

				if(isFatal(err)) {
					err = modify_error(error_modifiers,err,X);
					if(name!=null || notFatal(err)) // нельзя уменьшать значимость фатальной ошибки
						return err_in(X,name?name:'unnamed group',err);
					else
						return err;
				}
				else if(!isGood(err) ) {
					throw new Error('произошла нефатальная ошибка')
				}
				else {
					if(typeof back_res.res === 'string') inres.push(back_res.res);
					else                  inres.push(JSON.stringify(back_res.res));
				}
			}
			else if(compressed_patterns[i].type==='link') {
				// #todo поиск функции, а потом вызов как при pattern
			}
			else throw new Error('неизвестный тип паттерна');
		}

		set_res_cat(res,modify_result(modifiers,inres.join(''),X,pos.x),name)
		return true;
	}
	function obj_sequence(str,pos,res) { // name, compressed_patterns, modifiers, error_modifiers - closure
		var inres = {res:{}};
		var X = pos.x; // используется в сообщениях об ошибках
		for(var i=0; i<compressed_patterns.length; i++) {
			if(compressed_patterns[i] instanceof RegExp) {
				var m;
				if(m = compressed_patterns[i].exec(str.slice(pos.x))) {
					pos.x += m.index + m[0].length;
				}
				else
					return new FatalError(pos.x,'не могу прочитать /'+compressed_patterns[i].source.slice(1)+'/')
			}
			else if(compressed_patterns[i].type==='pattern') {
				/* если FatalError - возвращаем FatalError+обработка ошибок
					+ если задано name - обернуть в новый FatalError и завершить
				*/
				var err
				if(compressed_patterns[i].mode==='cat') {
					var back_res = {}; // игнорируем
					err = compressed_patterns[i].fun(str,pos,back_res); // ВЫЗВАЛИ!
				}
				else if(compressed_patterns[i].mode==='obj')
					err = compressed_patterns[i].fun(str,pos,inres); // ВЫЗВАЛИ!
				else throw new Error('неизвестный тип паттерна '+compressed_patterns[i].mode)

				if(isFatal(err)) {
					err = modify_error(error_modifiers,err,X);
					if(name!=null || notFatal(err)) // нельзя уменьшать значимость фатальной ошибки
						return err_in(X,name?name:'unnamed group',err);
					else
						return err;
				}
				else if(!isGood(err)) {
					throw new Error('произошла нефатальная ошибка')
				}
			}
			else if(compressed_patterns[i].type==='link') {
				// #todo поиск функции, а потом вызов как при pattern
			}
			else throw new Error('неизвестный тип паттерна');
		}

		set_res_obj(res,modify_result(modifiers,inres.res,X,pos.x),name)
		return true;
	}

	function filter_modifiers(modifiers) { // return {not,name,back_pattern,toString,modifiers,error_modifiers};
		/*
		обрабатываем модификаторы: 
			четное или нечетное количество not
			извлекаем returnname и back_pattern, если есть
			обработчики ошибок переносим в error_modifiers, который надо выполнять сначала к концу
			а оставшиеся модификаторы с конца к началу
		*/
		var not = false;
		var name = null;
		var toString = false;
		var back_pattern = null;
		var error_modifiers = [];
		for(var i = modifiers.length-1; i>=0; i--) {
			if(modifiers[i].type==='not') { // ?!
				not = !not;
				modifiers.splice(i,1);
			}
			else if(modifiers[i].type==='returnname') { // ?name= ?=
				if(name===null)
					name = modifiers[i].data;
				else
					throw perr_dublicate(modifiers[i].pos,'имя');
				modifiers.splice(i,1);
			}
			else if(modifiers[i].type === 'back_pattern') { // ?name->
				if(back_pattern===null)
					back_pattern = modifiers[i].data;
				else
					throw perr_dublicate(modifiers[i].pos,'back_pattern');
				modifiers.splice(i,1);
			}
			else if(modifiers[i].type==='postscript') { // ?`code`< ?`code`error<
				if(modifiers[i].error)
					error_modifiers.push(modifiers.splice(i,1)[0]);
			}
			else if(modifiers[i].type==='toString') // ?toString:
				toString = true;
			else
				throw new Error('неизвестный тип модификатора: '+modifiers[i].type)
		}
		return {not,name,back_pattern,toString,modifiers,error_modifiers};
	}

	/*=== определение типа последовательности, и какой она является ===
		выражения без скобок имеют тип 'cat', и не имеют атрибута direct
		последовательность является объектной, если хотябы одна из функций, которую она вызывает, 
			имеет тип obj, иначе последовательность является конкатенирующей
		но если последовательность состоит только из вызова ссылки на паттерн, и при этом указано (возможно пустое) имя
			то последовательность все равно является объектной
			
		если последовательность вызывает хотябы одну функцию, которая direct
			то она обязана иметь (возможно пустое) имя
		объектная последовательность может иметь обработчики только если имеет (возможно пустое) имя

		последовательность имеет тип obj, если у нее задано (возможно пустое) имя или она является объектной, 
			в противном случае она имеет тип cat
		но если последовательность имеет модификатор ?toString: то она все равно имеет тип cat
		если в последовательности имеется модификатор ?!(не), то она всегда имеет тип cat, 
			и всегда возвращает пустую строку в случае НЕудачного завершения
		последовательности, у которых задано пустое имя имеют атрибут direct
	*/

	var mode = 'cat';
	var compressed_patterns = [];
	var has_direct = -1;
	/*
	создаем массив паттернов, которые будет вызывать e_sequence:
		последовательность символов объединяем в один регексп
		для cycle создаем функцию и преобразуем в pattern (#todo)
	*/
	var cache = [];
	try{ patterns.forEach(m=>{
		function cat_cycle(str,pos,res) { // c_name, c_pattern, m.quant, c_modifiers, c_error_modifiers - closure
			/* циклы
				конкатенирующие циклы передают-получают результат по ссылке и конкатенируют его 
					(предварительно приведя к строке JSON, если это не строка)
			*/
			var inres = [];
			var X = pos.x; // используется в сообщениях об ошибках и для восстановления после not
			var i=0;
			for(; i<m.quant.min; i++) {
				var back_res = {};

				var err = c_pattern(str,pos,back_res); // ВЫЗВАЛИ!

				if(isFatal(err)) {
					err = modify_error(c_error_modifiers,err,X);
					if(c_name!=null || notFatal(err)) // нельзя уменьшать значимость фатальной ошибки
						return err_in(X,c_name?c_name:'unnamed cycle',err)
					else
						return err;
				}
				else if(!isGood(err)) {
					throw new Error('произошла нефатальная ошибка')
				}
				else {
					if(typeof back_res.res === 'string') inres.push(back_res.res);
					else                  inres.push(JSON.stringify(back_res.res));
				}
			}
			for(; i<m.quant.max; i++) {
				var back_res = {};
				var local_x = pos.x;

				var err = c_pattern(str,pos,back_res); // ВЫЗВАЛИ!

				if(isFatal(err)) {
					pos.x = local_x;
					// #todo parser_tail_error
					break;
				}
				else if(!isGood(err)) {
					throw new Error('произошла нефатальная ошибка')
				}
				else {
					if(local_x === pos.x)
						return err_uncycle(local_x,i,c_name?c_name:'unnamed cycle');
					if(typeof back_res.res === 'string') inres.push(back_res.res);
					else                  inres.push(JSON.stringify(back_res.res));
				}
			}

			set_res_cat(res,modify_result(c_modifiers,inres.join(''),X,pos.x),c_name);
			return true;
		}

		function obj_cycle(str,pos,res) { // c_name, c_pattern, m.quant, c_modifiers, c_error_modifiers - closure
			/* циклы
				объектные циклы на каждой итерации создают и передают объект для модификации
					после чего добавляют его в свой массив, который является результирующим объектом
			*/
			var inres = [];
			var X = pos.x; // используется в сообщениях об ошибках и для восстановления после not
			var i=0;
			for(; i<m.quant.min; i++) {
				var back_res = {res:{}};

				var err = c_pattern(str,pos,back_res); // ВЫЗВАЛИ!

				if(isFatal(err)) {
					err = modify_error(c_error_modifiers,err,X);
					if(c_name!=null || notFatal(err)) // нельзя уменьшать значимость фатальной ошибки
						return err_in(X,c_name?c_name:'unnamed cycle',err)
					else
						return err;
				}
				else if(!isGood(err)) {
					throw new Error('произошла нефатальная ошибка')
				}
				else inres.push(back_res.res);
			}
			for(; i<m.quant.max; i++) {
				var back_res = {res:{}};
				var local_x = pos.x;

				var err = c_pattern(str,pos,back_res); // ВЫЗВАЛИ!

				if(isFatal(err)) {
					pos.x = local_x;
					// #todo parser_tail_error
					break;
				}
				else if(!isGood(err)) {
					throw new Error('произошла нефатальная ошибка')
				}
				else {
					if(local_x === pos.x)
						return err_uncycle(local_x,i,c_name?c_name:'unnamed cycle');
					inres.push(back_res.res);
				}
			}

			set_res_obj(res,modify_result(c_modifiers,inres,X,pos.x),c_name);
			return true;
		}

		if(m.type === 'symbol') {
			if(typeOf(m.symbol)==='string')
				cache.push(escaper(m.symbol)+(m.quant===null ? '' : minmaxToRegExp(m.quant)))
			else if(m.symbol instanceof RegExp)
				cache.push(m.symbol.source+(m.quant===null ? '' : minmaxToRegExp(m.quant)))
			else console.assert(false,'неизвестный тип символа')
		}
		else {
			if(cache.length>0)
				compressed_patterns.push(new RegExp('^'+cache.join('')));
			cache = [];
			if(m.type === 'pattern' || m.type === 'link') {
				if(m.mode==='obj') mode = 'obj';
				if(has_direct<m.direct) has_direct = m.direct;
				compressed_patterns.push(m);
			} 
			else if(m.type === 'cycle') {
				var m_schema = {allOfPropSchemas:[
					{requiredProperties:{
						type:{ enum:['cycle'] },
						quant:{ $ref:'#quantificator'},
						cycle_modifiers:{ $ref:'modifiers_schema' }
					}},
					{$ref:'#fun_schema'} // mode,fun,direct
				]}

				//(?!*aaa)* (?!(aaa)*)
				/*=== определение типа цикла, и каким он является ===
					цикл является объектным, если функция, которую он вызывает, 
						имеет тип obj, иначе цикл является конкатенирующим
						
					если цикл является объектным, он обязан иметь (возможно пустое) имя
					back_pattern в цикле нельзя указывать

					цикл имеет тип obj, если у него задано (возможно пустое) имя или он является объектным, 
						в противном случае он имеет тип cat
					но если цикл имеет модификатор ?toString: то он все равно имеет тип cat
					если в цикле имеется модификатор ?!(не), то он всегда имеет тип cat, 
						и всегда возвращает пустую строку в случае НЕудачного завершения
					циклы, у которых задано пустое имя имеют атрибут direct
				*/
				// создание функции цикла, преобразовать m.type = 'pattern'
				// обработка модификаторов цикла
				var { 
					not:			c_not, 
					name:			c_name, 
					back_pattern:	c_back_pattern, 
					toString:		c_toString, 
					modifiers:		c_modifiers, 
					error_modifiers:c_error_modifiers 
				} = 
					filter_modifiers(m.cycle_modifiers);
				// m.mode - чем цикл является
				var c_pattern = m.fun;
				
				if(m.mode==='obj' && c_name===null) throw perr_c_name(m.pos)
				// m.mode - тип цикла
				m.mode = c_toString?'cat':m.mode==='obj'||c_name!==null?'obj':'cat';
				m.direct = c_name==='' ? m.pos : -1;

				if(back_pattern) return perr_cycle_bp(m.pos);
				if(c_not) {
					m.fun = make_not(m.mode==='obj' ? obj_cycle : cat_cycle,c_name)
					m.mode = 'cat';
					m.type = pattern;
				}
				else {
					// m.mode не трогаем
					m.fun = m.mode==='obj' ? obj_cycle : cat_cycle;
					m.type = 'pattern';
				}

				if(m.mode==='obj') mode = 'obj';
				if(has_direct<m.direct) has_direct = m.direct;
				compressed_patterns.push(m);
			}
			else throw new Error('неизвестный тип символа или паттерна или цикла');
		}
	}) }
	catch(err){
		if(err instanceof ParseError) return err;
		else                          throw  err;
	}
	if(cache.length>0)
		compressed_patterns.push(new RegExp('^'+cache.join('')));
	cache = [];

	// === parse_modifiers ===
	var not,name,toString,back_pattern,error_modifiers;
	try{
		({not,name,back_pattern,toString,modifiers,error_modifiers} = 
			filter_modifiers(modifiers,compressed_patterns.length>0,mode));
	}
	catch(err){
		if(err instanceof ParseError) return err;
		else                          throw  err;
	}
	if(compressed_patterns.length==1 && compressed_patterns[0].type=='link' && name!=null)
		mode = 'obj'
	if(back_pattern) {
		// #todo
		if(compressed_patterns.length>0)
			;//throw new ParseError(modifiers[i].pos,'нельзя одновременно указывать обратный паттерн и паттерн');
	}
	if(has_direct>=0 && name==null)
		return new ParseError(has_direct,'последовательность возвращает объект напрямую, следовательно родительская последовательность должна иметь (возможно пустое) имя');
	if(mode==='obj' && modifiers.length>0 && name===null)
		return new ParseError(pattern_x,'объектная последовательность может иметь обработчики, только если указано (возможно пустое) имя')

	var e_sequence = mode ==='obj' ? obj_sequence : cat_sequence;
	if(not) {
		// not-функция всегда 'cat'
		return {
			fun:make_not(e_sequence,name===null?'безымянная последовательность':name),
			mode:'cat',
			not:true,
			direct:-1
		};
	}
	else {
		return {
			fun:e_sequence,
			mode:(toString ? 'cat' : mode==='obj' || name!==null ? 'obj' : 'cat'),
			direct:(name==='' ? pattern_x : -1) // позиция используется в сообщениях об ошибках
		};
		console.log(name,tmp)
		
	}
},
(x,e)=>new FatalError(x,'не могу прочитать reg_sequence',e)
);
exports.reg_sequence = reg_sequence;

/*
alternatives ::= "sequence (`|`sequence)*"
*/
reg_alternatives.pattern = seq(need_all,reg_sequence,rep(seq(need(1),txt('|'),reg_sequence))).then(([head,tail])=>{
	/* перечисления
	=== как перечисления получают результат ===
	=== как пенчисления возвращают результат ===
		перечисления передают переданный им объект на прямую в каждую альтернативу-перечисление
	=== определение типа перечисления, и каким оно является ===
		перечисление имеет тип obj, если оно является объектным, 
			в противном случае оно имеет тип cat
		перечисление является объектным, если хотябы одна из функций, которую оно вызывает, 
			имеет тип obj, иначе перечисление является конкатенирующим
			
		перечисление имеет атрибут direct, если хотябы одна из альтернатив имеет атрибут direct
	*/
	if(tail.length ===0)
		return head;
	tail.unshift(head);
	var mode = 'cat';
	var direct = -1;
	for(var i = 0; i<tail.length; i++){
		if(tail[i].mode==='obj')
			mode = 'obj';
		if(tail[i].direct>=0)
			direct = tail[i].direct;
		if(mode==='obj' && direct>=0)
			break;
	}
	function e_alternatives(str,pos,res) {
		var X = pos.x;
		var errs = [];
		// #todo при ParseError завершаться почти как при удачном варианте
		for (var i = 0; i < tail.length; i++) {
			pos.x = X;
			/*
			 * передаем объект напрямую в каждую последовательность
			 * последовательность изменит объект только в случае удачного исхода
			 * последовательность с отрицанием в любом случае не должна изменить объект
			 */
			var err = tail[i].fun(str,pos,res);
			if(tail[i].not) {
				if(err.err==='continue')
					continue;
				else if(isFatal(err)) {
					if(errs.length===0)
						return err;
					else {
						errs.push(err);
						return err_any(X,errs)
					}
				}
				else
					throw new Error('последовательность с отрицанием вернула '+JSON.stringify(err));
			}
			if(!isGood(err)) {
				errs.push(err);
				continue;
			}
			return true;
		}
		if(errs.length===0){
			if(mode==='cat')
				res.res = '';
			return true;
		}
		return err_any(X,errs)
	}
	return {
		fun:e_alternatives,
		mode,
		direct
	}
})
/*
// чтобы использовать имена в группе с квантификатором, она должна быть именованной
рег: namedSequence ::= "namedModifier* (symbol quantificator? | \
`(` namedModifier* `*` 	namedAlternatives 	`)` quantificator 	| \
`(` 			alternatives 		`)` quantificator 	| \
`(` 			namedAlternatives 	`)` 			)*"
БНФ: namedSequence ::= "namedModifier* spc* (symbol quantificator? spc* | \
`(` namedModifier* `*` 	namedAlternatives 	spc* `)` quantificator 	spc* | \
`(` 			alternatives 		spc* `)` quantificator 	spc* | \
`(` 			namedAlternatives 	spc* `)` 		spc* )*"
// последовательность символов с квантификаторами преобразует в один регексп (с галкой в начале)
// 

namedAlternatives ::= "namedSequence (`|`namedSequence)*"

main ::= "namedAlternatives `$`?"
// в строку в начале автоматически добавляется `?=`

// группы пока только энергичные, без возвратов, как будто (?>...)
// обычным группам будет синтаксис ((нанана))
// функциональность \n где n - номер скобки - отсутствует, возможно ее можно будет выразить через (())
отличия от обычных regexp-ов:
рекурсивные - можно вызывать один паттерн из другого (есть в perl)
группы надо именовать вручную
результат группы можно обработать прям сразу
по умолчанию результат возвращается в JSON



p_sequence
	символ		1
	e_sequence	2...
	e_cycle		4
p_alternatives
	<e_sequence>	...2
	e_alternatives	3


p_sequence, который вызывает символы (с квантификатором), и который создает e_sequence, который вызывает эти символы
p_sequence, который вызывает p_alternatives (без квантификатора), и который создает e_sequence, который может вызывать результат p_alternatives
	p_alternatives, который вызывает p_sequence (только один), и который возвращает результат p_sequence
p_alternatives, который вызывает p_sequence (через | ), и который создает e_alternatives, который может вызывать результат p_sequence
p_sequence, который вызывает p_alternatives (с квантификатором), и который создает e_cycle, который может вызывать результат p_alternatives
*/


}
	try{
		if(loaded_modules) { // it is not node.js
			module = new Module();
			main(module, module.exports, require);
			loaded_modules["parser"] = module.exports; 
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
