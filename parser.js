;(function(){
function main(module, exports, require) {
"use strict";

//мы поняли то что прочитали, но это не то, что мы хотим
function ParseError(where,what,res){
	console.assert(typeof where == 'number','in ParseError where ('+where+') is not a number')
	this.err = 1
	this.what = what; // если what - массив, то where не имеет смысла
	this.where = where;
	this.res = res; // не обязательный
}
//мы не поняли, что прочитали
function FatalError(where,what){
	console.assert(typeof where == 'number','in ParseError where ('+where+') is not a number')
	this.err = 2
	this.what = what; // если what - массив, то where не имеет смысла
	this.where = where;
}

// is result
function isGood(r){
	return typeof r === 'object' ? !r.err : r!==undefined ;
}

// is result or ParseError
function notFatal(r){
	return typeof r === 'object' ? r.err===undefined || r.err<2 : r!==undefined ;
}
function isFatal(r) { return !notFatal(r); }

function addErrMessage(r,message){
	if(!isGood(r) && r!==undefined) r.what+=message;
	return r;
}

//строка должна соответствовать паттерну от начала и до конца
//иначе ParseError(pos.x,'остались неразобранные символы',r)
function read_all(str, pos, pattern) {
	pos = {x:0}//и далее передаем всегда по ссылке
	var r = pattern(str,pos);
	if(!isGood(r))
		if(!r)
			return new FatalError(pos.x,'unknown error')
		else
			return r;
	else
		if(pos.x == str.length)
			return r;
		else
			return new ParseError(pos.x,'unparsed chars are remained',r);
}

// основной конструктор
function Pattern(exec) {
	// если pos не передан, то строка должна соответствовать паттерну от начала и до конца
	// иначе ParseError(pos.x,'остались неразобранные символы',r)
    this.exec = function pattern_exec(str, pos/*.x*/){
		if(pos === undefined) return read_all(str,pos,exec);
		else return exec(str,pos);
	};
	// если результат - то transform, иначе - error_transform
	// можно преобразовать результат в ошибку и наоборот
    this.then = function pattern_then(transform/*(r,x)*/,error_transform/*(x,r)*/) {
		if(error_transform){
			console.assert(typeof error_transform === 'function')
			if(typeof tranform === 'function')
				return new Pattern(function pattern_then_reserr(str,pos/*.x*/){
					var x = pos.x;
					var r = exec(str, pos);
					return (!isGood(r)) ?
						error_transform(x,r) :
						transform(r,x);
				});
			else
				return new Pattern(function pattern_then_err(str,pos/*.x*/){
					var x = pos.x;
					var r = exec(str, pos);
					return (!isGood(r)) ?
						error_transform(x,r) :
						r;
				});
		}
		else if(typeof transform === 'function')
			return new Pattern(function pattern_then_res(str, pos/*.x*/) {
				var x = pos.x;
				var r = exec(str, pos);
				return (!isGood(r)) ?
					r :
					transform(r,x);
			});
	}
	this.norm_err = function(){
		return new Pattern()
	}
}
function Forward(){
	this.exec = function forwrd_exec(){		return this.pattern.exec.apply(this.pattern,arguments);	}
	this.then = function forward_then(){	return this.pattern.then.apply(this.pattern,arguments);	}
}


// если текст читается - возвращает его, иначе ничего
function read_txt(str, pos, text) {
	if (str.substr(pos.x, text.length) == text)	{
		pos.x += text.length;
		return text;
	}
}
function txt(text) {
    return new Pattern((str,pos)=>read_txt(str,pos,text));
}

// если regexp читается (не забываем в начале ставить ^)
//- возвращает массив разбора ([0] - вся строка, [1]... - соответствуют скобкам из regexp)
//, иначе ничего
function read_rgx(str, pos, regexp) {
	var m;
	if (m = regexp.exec(str.slice(pos.x))){
		pos.x += m.index + m[0].length;
		return m
	}
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
function read_opt(str, pos, pattern) {
	var x = pos.x;
	var r = pattern(str, pos)
	if(!isGood(r))	{
		pos.x=x;
		return {err:0};	//не ошибка
	}
	return r;
}
function opt(pattern) {
    return new Pattern((str,pos)=>read_opt(str,pos,pattern.exec));
}

// читает последовательность, в случае неудачи позицию НЕ восстанавливает
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
function need_all(res/*.a*/,r/*.res*/,i,pos){ // isFatal()
	if(!notFatal(r.res))
		return true;
	if(!isGood(r.res)){
		res.a.err = 1;
		if(res.a.what)
			res.a.what.push(r.res);
		else
			res.a.what = [r.res];
	}
	res.a.push(r.res);
	return false;
}
// в случае ParseError у результата устанавливает .err=1 и .what = массиву ошибок ParseError
function need_none(res/*.a*/,r/*.res*/,i,pos){ // isFatal()
	if(!notFatal(r.res))
		return true;
	if(!isGood(r.res)){
		res.a.err = 1;
		if(res.a.what)
			res.a.what.push(r.res);
		else
			res.a.what = [r.res];
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
			if(!isGood(r.res)){
				res.a.err = 1;
				if(res.a.what)
					res.a.what.push(r.res);
				else
					res.a.what = [r.res];
			}
			if(i==indexes[0])	res.a = r.res;
			return false;
		}
	else
		// + добавляет результаты в заданные позиции ответа
		return function need_indexes(res/*.a*/,r/*.res*/,i,pos){ // isFatal()
			if(!notFatal(r.res))
				return true;
			if(!isGood(r.res)){
				res.err = 1;
				if(res.what)
					res.what.push(r.res);
				else
					res.what = [r.res];
			}
			var k = indexes.indexOf(i);
			if(k!=-1)	res.a[k] = r.res;
			return false;
		}
}

// в начале читает pattern, потом последовательность separated
// ответ - массив результатов паттернов
// от паттерна не требует восстанавливать позицию в случае неудачи (делает это сам)
function read_rep(str, pos, pattern, separated, min, max) {
	min = min===undefined ? 0 : min;
	max = max===undefined ? +Infinity : max;
	var res = [], x = pos.x, r = pattern(str, pos);
	var i = 1;

	if(min>0 && !isGood(r)/* && isGoog(res)*/){
		res.err = 1;
		res.where = x;
		res.what = r.what;
	}
	while (i<min && notFatal(r)) {
		if(!isGood(r) && isGoog(res)){
			res.err = 1;
			res.where = x;
			res.what = r.what;
		}
		res.push(r);
		x = pos.x;
		r = separated(str, pos/*.x*/);
		i++;
	}
	if(min>0 && !notFatal(r)){
		pos.x = x;
		return r;
	}
	if(!isGood(res) || i==1 && !isGood(r)){
		pos.x = x;
		return res;
	}

	while (i<max && isGood(r)) {
		res.push(r);
		x = pos.x;
		r = separated(str, pos/*.x*/);
		i++;
	}
	if(isGood(r))
		res.push(r);
	else
		pos.x = x;
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

// #todo понадобится - доделать
// то же что и rep, только допускает возможность ParseError
// в этом случае устанавливает .err = 1
function rep_more(pattern, separator) {
    var separated = !separator ? pattern :
        seq(need(1), separator, pattern);

    return new Pattern(function rep_more_pattern(str, pos/*.x*/) {
        var res = [], x = pos.x, r = pattern.exec(str, pos);
        while (notFatal(r)) {
            res.push(r);
			if(r.err) res.err = 1;
            x = pos.x;
            r = separated.exec(str, pos);
        }
		pos.x = x;
        return res;
    });
}

// перебирает паттерны с одной и той же позиции до достижения удачного результата
// от isGood зависит, будут ли собираться ошибки
function read_any(str, pos/*.x*/, isGood, patterns) {
	var errs = {a:{	err:2,//default fatal
					what:[]}},
		x = pos.x;
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
	errs.a.what.push(r)//collect
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

// spc ::= "[\ \r\n\t\v\f]"
var spc = rgx(/^[\ \r\n\t\v\f]/);
// num ::= "[0-9]+"
var num = rgx(/^[0-9]+/).then((m)=>+m[0]);
// identifier ::= "[a-zA-Z_][a-zA-Z_0-9]*"
var identifier = rgx(/^[a-zA-Z_][a-zA-Z_0-9]*/).then((m)=>m[0])

/*
quotedSequence ::= /`\`` ( [^\`] | `\\\``)* `\``/
// возвращает строку
*/
var quotedSequence = rgx(/^`(([^`\\]|\\\\|\\`)*)`/).then((m)=>m[1].replace(/\\\\|\\`/g,(escseq)=>{
	var res = escseq==='\\\\' ? '\\' : '`';
	//console.log('escseq = '+escseq+' to '+ res);
	return res;
}));
exports.quotedSequence = quotedSequence;

/*
рег: char ::= /[^\\\/\``|$.*+?()[]{}`] | `\\`./ // [\\\/\``|$.*+?()[]{}bfnrtv'"`] /
БНФ: char ::= /`\\`. / // здесь экранируется всё
// возвращает символ
*/
var reg_char = rgx(/^[^\\\/`\|\$\.\*\+\?\(\)\[\]\{\}]|\\./).then((m)=>m[0].replace(/\\(.)/,'$1'));
exports.reg_char = reg_char;
var bnf_char = rgx(/^\\(.)/).then((m)=>m[1]);
exports.bnf_char = bnf_char;

/*
рег: classChar ::= /[^\\\/\``^-|$.*+?()[]{}`] | `\\`. / // [\\\/\``^-|$.*+?()[]{}bfnrtv'"`]/ // отличие от char в ^ и -
БНФ: classChar ::= /[^\\\/\`` ^-|$.*+?()[]{}`] | `\\`. / // [\\\/\`` ^-|$.*+?()[]{}bfnrtv'"`]/ // здесь еще пробел экранируется
// возвращает символ
*/
var reg_classChar = rgx(/^[^\^\-\\\/`\|\$\.\*\+\?\(\)\[\]\{\}]|\\./).then((m)=>m[0].replace(/\\(.)/,'$1'));
exports.reg_classChar = reg_classChar;
var bnf_classChar = rgx(/^[^\^\-\ \\\/`\|\$\.\*\+\?\(\)\[\]\{\}]|\\./).then((m)=>m[0].replace(/\\(.)/,'$1'));
exports.bnf_classChar = bnf_classChar;

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
var star = {min:0,max:Infinity};
var voider = (r)=>typeof r === 'object' && r.err===0 ? '' : r; 
var reg_class = any(collect,
	txt('.'),
	seq(need_all, 
		txt('['), opt(txt('^')).then(voider), 
		rep(any(collect, 
			seq(need_all, 
				reg_classChar.then(escaper), opt(seq(need_all, txt('-'), reg_classChar.then(escaper)).then(merger)).then(voider)
			).then(merger),
			quotedSequence.then(escaper)
		),star).then(merger), 
		txt(']') 
	).then(merger)
).then((s)=>new RegExp(s));
exports.reg_class = reg_class;
var spcs = rep(spc,star).then((r)=>'');
var bnf_class = any(collect,
	txt('.'),
	seq(need_all, 
		txt('['), opt(txt('^')).then(voider), spcs, 
		rep(any(collect, 
			seq(need_all, 
				bnf_classChar.then(escaper), 
				opt(seq(need_all, txt('-'), bnf_classChar.then(escaper)).then(merger)).then(voider),
				spcs
			).then(merger),
			seq(need(0), quotedSequence.then(escaper), spcs)
		),star).then(merger), 
		txt(']') 
	).then(merger)
).then((s)=>new RegExp(s));
exports.bnf_class = bnf_class;


/*
balansedBrackets ::= "`(`([^`(`]|balansedBrackets)*`)`" 
рег: link ::= "`$`(identifier|`{`identifier balansedBrackets? `}`)"
БНФ: link ::= "`$`( identifier | `{` identifier balansedBrackets?`}` ) | identifier balansedBrackets?" // без пробелов
// возвращает ссылку на паттерн
*/

/*
symbol ::= "char|quotedSequence|class|link"
// возвращает строку или регексп или ссылку на паттерн
*/
var reg_symbol = any(collect,reg_char,quotedSequence,reg_class);
var bnf_symbol = any(collect,bnf_char,quotedSequence,bnf_class);

/*
рег: quantificator ::= "[`*+?`]|`{`(num|num?`,`num?)`}`" // пока только энергичные
БНФ: quantificator ::= "[`*+?`]|`{`spc*(num|num?spc*`,`spc*num?)spc*`}`"
// возвращет объект {min:int,max:int}
*/
var reg_quantificator = any(collect,
	txt('*').then(()=>({min:0,max:Infinity})),
	txt('+').then(()=>({min:1,max:Infinity})),
	txt('?').then(()=>({min:0,max:1})),
	seq(need(1),txt('{'),
		any(collect,
			seq(need(1),txt(','),num).then((n)=>({min:0,max:n})),
			seq(need_all,
				num,
				opt(seq(need(1),txt(','),
					opt(num).then((n)=>typeof n === 'number' ? n : Infinity))
				)
			).then((arr)=>({
				min:arr[0],max:typeof arr[1] === 'number' ? arr[1] : arr[0]
			}))
		)
	,txt('}'))
);
exports.reg_quantificator = reg_quantificator;
var bnf_quantificator = any(collect,
	txt('*').then(()=>({min:0,max:Infinity})),
	txt('+').then(()=>({min:1,max:Infinity})),
	txt('?').then(()=>({min:0,max:1})),
	seq(need(2),txt('{'),spcs,
		any(collect,
			seq(need(2),txt(','),spcs,num).then((n)=>({min:0,max:n})),
			seq(need_all,
				num,
				opt(seq(need(3),spcs,txt(','),spcs,
					opt(num).then((n)=>typeof n === 'number' ? n : Infinity))
				)
			).then((arr)=>({
				min:arr[0],max:typeof arr[1] === 'number' ? arr[1] : arr[0]
			}))
		),
	spcs,txt('}'))
);
exports.bnf_quantificator = bnf_quantificator;


/*
modifier ::= "`?` ( `!` | \\` ([^\\`])* `\\`<` | identifier`->`)?"
namedModifier ::= "modifier | `?`identifier?`=`"
// возвращает объект {type: строка(not|postscript|backpattern|returnname), data:строка или function(arg,global,stack)}
// если в тексте функции не встретилось return, оно добавляется перед все строкой
*/
function code_to_fun(code) {
	var fun;
	if(/^\s*\{/.test(code) && /\}\s*$/.test(code))
		return new Function('arg','global','stack',code);
	else
		return new Function('arg','global','stack','return '+code);
	return 
}
var modifier = seq(need(1), txt('?'), any(collect,
	txt('!').then((r)=>({type:'not'})),
	seq(need(1),txt('`'),
		rgx(/^[^`]*/).then((m)=>({type:'postscript',data:m[0]})),
		txt('`<'))
	//,seq(need(0),identifier,txt('->'))   // на будущее
));
var namedModifier = any(collect,
	modifier,
	seq(need(1),txt('?'), opt(identifier).then(voider).then((s)=>({type:'returnname',data:s})), txt('='))
);
exports.namedModifier = namedModifier;

/*
рег: sequence ::= "modifier* (symbol quantificator? | `(`alternatives`)` quantificator? )*" 
БНФ: sequence ::= "(modifier )* spc* (symbol quantificator? spc* | `(` alternatives spc* `)` quantificator? spc* )*"
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

alternatives ::= "sequence (`|`sequence)*"
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
exports.rep_more = rep_more; // #todo понадобится - доделать
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
