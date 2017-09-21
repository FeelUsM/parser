// требует utils
;(function(){
function main(module, exports, require) {
"use strict";

copyProps(require('meta_parser'),window);
var test = require('parser_test_utils');
/* exports
exports.err_spc = err_spc;
exports.err_num = err_num;
exports.err_id = err_id;

exports.err_qseq = err_qseq;
exports.err_char = err_char;
exports.err_classChar = err_classChar;
exports.err_inClass = err_inClass;
exports.err_link = err_link;

exports.err_quant = err_quant;
exports.reg_quantifier = reg_quantifier;
//exports.quantifier = quantifier;
exports.err_string = err_string;
//exports.string = string;
exports.err_obj = err_obj;
//exports.object = object;
//exports.pre_code = pre_code;
//exports.modifier = modifier;
//exports.fake_modifier = fake_modifier;
exports.err_reg_sequence = err_reg_sequence;
exports.reg_sequence = reg_sequence;
exports.err_fail_not = err_fail_not;
//exports.fake_reg_sequence = fake_reg_sequence;
//exports.bnf_sequence = bnf_sequence;
*/

/* about
инетрпретатор интерпретаторов:
инетрпретатор
берет код интерпретатора
и возвращает функцию, которая 
	берет код программы
	и печатает преобразованный код программы
	или возвращает функцию, которая что-то делает
		например берет код программы
		и возвращает функцию, которая что-то делает

язык нерегулярных (контекстно-свободных) выражений

отличия от обычных regexp-ов:
рекурсивные - можно вызывать один паттерн из другого (есть в perl)
группы надо именовать вручную (в регекспах они автоматически нумеруются)
результат группы можно обработать прям сразу
по умолчанию результат возвращается в JSON

2 режима логики:
	строковый-конкатенирующий
	объектный
обработчики на javascript
2 режима синтаксиса:
	"regexp" - символы (в том числе пробел) являются симвлами паттерна, ссылки на паттерны начинаются с $
	"bnf" - 
		пробелы игнорируются, 
		ссылки на паттерны - просто идентификаторы (но могут начинаться и с $ - это не важно), 
		символы паттерна - в кавычках или экранируются
группы пока только энергичные, без возвратов, как будто (?>...)
a(bc|b|x)cc 
	abcc fail
	axcc OK
(a|b)*b(a|b)* - в любом случае средняя b останется не распознанной
*/

/* todo
переместить все тесты обратно в test.html
сделать веб-морду с 3мя полями: код, ввод, вывод
сделать и отладить поиск ссылок и общую работу
сделать проверку битых ссылок
tail_error
тесты:
	обработчиков
	ссылок
	back_pattern-ов
===============================
разобраться с политикой предоставления ошибок в parser-е
получать на вход обработчика ошибки как дочерние ошибки, так и удачные результаты(?)
 - ParseError - возвращается функцией и возвращается как результат.

задать расположение фишки link & back_pattern, и немного позаполнять
	ловля ошибок выполнения

сделать expr, main и web-интерфейс
добавить игнорирование строк и комментариев в обработчиках
npm, статья
примеры:
	калькулятор
	xml -> JSON
	подсветка синтаксиса
	что-то распарсить, отсортить, +замена
	самоописание
	
	c++: type operator.(class)(types)
	примитивный переводчик

(?`...`?(...):(....))
toLowercase
*/

/* описание синтаксиса
|| === обычные токены ===
spc :=[\ \r\n\t\v\f]|`(|`(?!`|)`|.)*`|)`|`||`[^\r\n\v\f]*[\r\n\v\f];
spcs:=$spc*;
num :=[0-9]+;
identifier :=[a-zA-Z_][a-zA-Z_0-9]*;

|| === токены символов ===
quotedSequence ::=\` ( [^\`\\] | \\\` | \\\\)* \` ;
reg_char :=[^\\\/\``;|$.*+?()[]{}`]|\\.;
	|| здесь перечислены управляющие символы, остальные символы считаются обычными
bnf_char :=\\.;
	|| любые символы считаются управляющими, обычные символы надо брать в кавычки или экранировать
	
reg_classChar ::= [^\\\/\``^-;|$.*+?()[]{}`] | `\\`.;
	|| к управляющим символам добавляется `^-`, пробелы разрешены
bnf_classChar ::= [^\\\/\``^-;|$.*+?()[]{} `]| `\\`.;
	|| к управляющим символам добавляется `^-`, пробелы запрещены
	
reg_class ::= `.` | `[``^`?      (reg_classChar(`-`reg_classChar)?      |quotedSequence     )*`]` 
	/ *=>new RegExp(arg)* /;
bnf_class ::= `.` | `[``^`? spcs (bnf_classChar(`-`bnf_classChar)? spcs |quotedSequence spcs)*`]` 
	/ *=>new RegExp(arg)* /;

reg_link ::= `$`  ( ?id=identifier | `{` (?id=identifier) `}` ) /*=>{link:arg.id}* /;
bnf_link ::= `$`? ( ?id=identifier | `{` (?id=identifier) `}` ) /*=>{link:arg.id}* /;

reg_symbol ::= reg_char|quotedSequence|reg_class|reg_link;
bnf_symbol ::= bnf_char|quotedSequence|bnf_class|bnf_link;

|| === другие токены: квантификаторы, модификаторы, обработчики ===
quantifier ::= [`*+?`] | `{` spcs (`,` spcs num | num (spcs `,` spcs num?)? ) spcs `}` ;
	|| возвращет объект {min:int,max:int}
	
modifier ::= `?`
	(	`!`              || отрицание
	|	identifier  `->` || back_pattern - то, что будет прочитано, превратиться в константу, и потом этот identifier можно будет вызывать как нетерминал
	|	identifier? `=`  || имя последовательности - имя результата
	|	`toString:`      || директива, преобразующая объектную последовательность в строковую
	);
	|| возвращет объект {type:string[,data:id]}
	
fake_handler ::= (`/*`|`/error*`)(?!`*``/`|.)*`*``/`;
	|| fake_... - синтаксис такой же как у настоящего, только не происходит обработка
	|| в `*``/` - `` не убран по тому, что иначе это будет воспринято концом комментария в js
	|| возвращет объект {error:bool,code:string}
handler ::= fake_handler;
	|| `/*код*``//*=>выр-е*``//*?выр-е по умолчанию*``//error*код*``//error*=>выр-е*``//error*?выр-е по умолчанию*``/`
	|| возвращет объект {error:bool,code:Function}

|| === ядро ===
reg_sequence ::=
	modifier* handler*
	(	(	reg_symbol
		|	`(`      (modifier* `//`)?             reg_alternatives   (`//` spcs (handler spcs)*)?`)`
		)
		quantifier?
	)+
	(handler spcs)*;
reg_alternatives ::= reg_sequence (`|` reg_sequence)*;

bnf_sequence_ ::=
	(modifier spcs)* (handler spcs)*
	(	(	bnf_symbol
		|	`(` spcs ((modifier spcs)* `//` spcs)? bnf_alternatives_  (`//` spcs (handler spcs)*)? `)`
		)	spcs
		(quantifier spcs)?
	)+
	(handler spcs)*;
bnf_alternatives_ ::= bnf_sequence_ (`|` spcs bnf_sequence_)*;
(| подчеркивание в конце означает, что этот паттерн сам съедает в конце пробелы,
т.е. после него не обязательно добавлять spcs |)

|| === начало ===
expr ::= identifier spcs (`:=`reg_alternatives | `::=` spcs bnf_alternatives_ );
main ::= spcs (handler spcs)* expr(`;` spcs expr)* (`;` spcs)? ;
*/

Error.prototype.toJSON = function(){ return {name:this.name,message:this.message} }

var err_in_f = (x, what, why)=>new FatalError(x,'in '+what,why)
var err_in_p = (x, what, why)=>new ParseError(x,'in '+what,why)
var err_in = (x, what, why)=>isFatal(why) ? err_in_f(x, what, why) : err_in_p(x, what, why);

var merger = (arr)=>{
	var r = arr.join('');
	//console.log('merge: '+r);
	return r;
}

// возвращает регексп (без галки вначале)
var escaper = (s)=>{
	var r = s.replace(/([\^\-\ \\\/\|\$\.\*\+\?\(\)\[\]\{\}])/g,'\\$1');
	//console.log('replace: '+r);
	return r;
}

//{ ==== обычные токены ====
test.add_category('/','simpleTokens','');

//{ spc :=[\ \r\n\t\v\f]|`(|`(?!`|)`|.)*`|)`|`||`[^\r\n\v\f]*[\r\n\v\f];
var err_spc = (x)=>new FatalError(x,'ожидался пробельный символ');
exports.err_spc = err_spc;
var spc = any(
	rgx(/^[\ \r\n\t\v\f]/),
	seq(need_none,txt('(|'),rep(exc(txt('|)'),rgx(/./))),txt('|)')),
	seq(need_none,txt('||'),rgx(/[^\r\n\v\f]*[\r\n\v\f]/))
).then(0,err_spc);
//}

//{ spcs:=$spc*;
var spcs = rep(spc).then(r=>'');
test.add_test('/simpleTokens','spcs',(path)=>{
	describe('spcs:=$spc*;   spc :=[\ \\r\\n\\t\\v\\f]|`(|`(?!`|)`|.)*`|)`|`||`[^\\r\\n\\v\\f]*[\\r\\n\\v\\f];',()=>{
		it_compile(''                ,'',compile(spcs))
		it_compile('    '            ,'',compile(spcs))
		it_compile('||stdgdy\n'	     ,'',compile(spcs))
		it_compile(' (|dtydydyf|) '  ,'',compile(spcs))
		//it_err_compile(""	,()=>err_qseq(0),compile(spcs))
	})
});
spcs.exec('(|adg|)');
//}

//{ num :=[0-9]+;
var err_num = (x)=>new FatalError(x,'ожидалось число');
exports.err_num = err_num;
var num = rgx(/^[0-9]+/).then(m=>+m[0],err_num);
//}

//{ identifier :=[a-zA-Z_][a-zA-Z_0-9]*;
var err_id = (x)=>new FatalError(x,'ожидался идентификатор');
exports.err_id = err_id;
var identifier = rgx(/^[a-zA-Z_][a-zA-Z_0-9]*/).then(m=>m[0],err_id)
//}

//}

//{ ==== токены символов ====
test.add_category('/','symbolTokens','');

var err_qseq = (x)=>new FatalError(x,'ожидалась строка в обратных кавычках');
exports.err_qseq = err_qseq;
//{ quotedSequence ::= \` ( [^\`\\] | \\\` | \\\\)* \` ;
// возвращает строку, в которой убрано экранирование
var quotedSequence = rgx(/^`(([^`\\]|\\\\|\\`)*)`/).then(
	m=>m[1].replace(/\\\\|\\`/g,(escseq)=>{
		var res = escseq==='\\\\' ? '\\' : '`';
		//console.log('escseq = '+escseq+' to '+ res);
		return res;
	}),
	err_qseq
);
test.add_test('/symbolTokens','quotedSequence',(path)=>{
	describe('quotedSequence ::='+/`\`` ( [^\`\\] | `\\\`` | `\\\\`)* `\``/.source+
			'; || возвращает строку, в которой убрано экранирование',()=>{
		it_compile(	/`qwer`/.source		,'qwer'			,compile(quotedSequence))
		it_compile(	/`qw\\er`/.source	,'qw\\er'		,compile(quotedSequence))
		it_compile(	/`qw\`er`/.source	,'qw`er'		,compile(quotedSequence))
		it_compile(	/`qw\\\`er`/.source	,'qw\\`er'		,compile(quotedSequence))
		it_err_compile(	""				,()=>err_qseq(0),compile(quotedSequence))
	})
})
//}

var err_char = (x)=>new FatalError(x,'ожидался символ');
exports.err_char = err_char;
//{ reg_char :=[^\\\/\``;|$.*+?()[]{}`]|\\.;
//	|| здесь перечислены управляющие символы, остальные символы считаются обычными
// возвращает символ
var reg_char = rgx(/^[^\\\/`;\|\$\.\*\+\?\(\)\[\]\{\}]|\\./).then(
	m=>m[0].replace(/\\(.)/,'$1'),
	err_char
);
test.add_test('/symbolTokens','reg_char',(path)=>{
	describe('reg_char ::='+/[^\\\/\``;|$.*+?()[]{}`] | \\./.source+'; || возвращает символ;  здесь перечислены управляющие символы, остальные символы считаются обычными',()=>{
		it_compile(		'1'		,'1'			,compile(reg_char))
		it_err_compile(	'$'		,()=>err_char(0),compile(reg_char))
		it_compile(		'\\$'	,'$'			,compile(reg_char))
		it_err_compile(	""		,()=>err_char(0),compile(reg_char))
	})
})
//}
//{ bnf_char :=\\.;
//	|| любые символы считаются управляющими, обычные символы надо брать в кавычки или экранировать
var bnf_char = rgx(/^\\(.)/).then(
	m=>m[1],
	err_char
);
test.add_test('/symbolTokens','bnf_char',(path)=>{
	describe('bnf_char ::= '+/\\./.source+'; || возвращает символ; \
любые символы считаются управляющими, обычные символы надо брать в кавычки или экранировать',
	()=>{
		it_compile    ('\\1','1'            ,compile(bnf_char))
		it_err_compile('1'	,()=>err_char(0),compile(bnf_char))
		it_err_compile('$'	,()=>err_char(0),compile(bnf_char))
		it_err_compile(''	,()=>err_char(0),compile(bnf_char))
	})
})
//}

var err_classChar = (x)=>new FatalError(x,'ожидался символ класса символов');
exports.err_classChar = err_classChar;
//{ reg_classChar ::= [^\\\/\``^-;|$.*+?()[]{}`] | `\\`.
//	(?#к управляющим символам добавляется `^-`, пробелы разрешены);
// возвращает символ
var reg_classChar = rgx(/^[^\^\-\\\/`;\|\$\.\*\+\?\(\)\[\]\{\}]|\\./).then(
	m=>m[0].replace(/\\(.)/,'$1'),
	err_classChar
);
test.add_test('/symbolTokens','reg_classChar',(path)=>{
	describe('reg_classChar ::= ['+/^\\\/\`/.source+'`^-;|$.*+?()[]{}`] | '+/\\./.source+
	'; || возвращает символ;  к управляющим символам добавляется `^-`, пробелы разрешены',()=>{
		it_compile(		'1'		,'1'					,compile(reg_classChar))
		it_compile(		' '		,' '					,compile(reg_classChar))
		it_err_compile(	'^'		,()=>err_classChar(0)	,compile(reg_classChar))
		it_err_compile(	'-'		,()=>err_classChar(0)	,compile(reg_classChar))
		it_compile(		'\\^'	,'^'					,compile(reg_classChar))
		it_compile(		'\\-'	,'-'					,compile(reg_classChar))
		it_err_compile(	''		,()=>err_classChar(0)	,compile(reg_classChar))
	})
})
//}
//{ bnf_classChar ::= [^\\\/\``^-;|$.*+?()[]{} `]| `\\`.
//	(?#к управляющим символам добавляется `^-`, пробелы запрещены) ;
var bnf_classChar = rgx(/^[^\^\-\\\/`;\|\$\.\*\+\?\(\)\[\]\{\}\ ]|\\./).then(
	m=>m[0].replace(/\\(.)/,'$1'),
	err_classChar
);
test.add_test('/symbolTokens','bnf_classChar',(path)=>{
	describe('bnf_classChar ::= ['+/^\\\/\`/.source+'`^-;|$.*+?()[]{} `] | '+/\\./.source+
	'; || возвращает символ;  к управляющим символам добавляется `^-`, пробелы запрещены',()=>{
		it_compile(		'1'     ,'1'                    ,compile(bnf_classChar))
		it_err_compile(	' '		,()=>err_classChar(0)	,compile(bnf_classChar))
		it_err_compile(	'^'		,()=>err_classChar(0)	,compile(bnf_classChar))
		it_err_compile(	'-'		,()=>err_classChar(0)	,compile(bnf_classChar))
		it_compile(		'\\^'	,'^'					,compile(bnf_classChar))
		it_compile(		'\\-'	,'-'					,compile(bnf_classChar))
		it_err_compile(	''		,()=>err_classChar(0)	,compile(bnf_classChar))
	})
})
//}

var err_inClass = messageAdder('класс символов');
exports.err_inClass = err_inClass;
//{	reg_class ::= `.` | `[``^`?      (reg_classChar(`-`reg_classChar)?      |quotedSequence     )*`]` 
//	/ *=>new RegExp(arg)* /;
var reg_class = any(
	txt('.'),
	seq(need_all, 
		txt('['), opt(txt('^'),''),
		rep(any( 
			seq(need_all, 
				reg_classChar.then(escaper),
				opt(seq(need_all, txt('-'), reg_classChar.then(escaper)).then(merger),'')
			).then(merger),
			quotedSequence.then(escaper)
		),star).then(merger), 
		txt(']') 
	).then(merger)
).then(
	s=>new RegExp(s),
	err_inClass
);
test.add_test('/symbolTokens','reg_class',(path)=>{
	describe('reg_class ::= `.`|`[``^`? (reg_classChar(`-`reg_classChar)? |quotedSequence )*`]`'
	+'; || возвращает регексп (без галки вначале)',()=>{
		it_err_compile(	''			,()=>fatalCollect(0,[err_txt(0,'.'),err_txt(0,'[')]),
			compile(reg_class));
		it_compile(		'.'			,/./												,
			compile(reg_class))
		it_err_compile(	'['			,()=>new FatalError(1,'',[
			err_txt(1,'^'),err_classChar(1),err_qseq(1),err_txt(1,']'),err_txt(0,'.')])	,
			compile(reg_class))
		it_compile(		'[]'		,/[]/												,
			compile(reg_class))
		it_compile(		'[^]'		,/[^]/												,
			compile(reg_class))
		it_compile(		'[`abc`]'	,/[abc]/											,
			compile(reg_class))
		it_compile(		'[`a^$`]'	,/[a\^\$]/											,
			compile(reg_class))
		it_compile(		'[abc]'		,/[abc]/											,
			compile(reg_class))
		it_compile(		'[a-z]'		,/[a-z]/											,
			compile(reg_class))
		it_compile(		'[\\$-\\^]'	,/[\$-\^]/											,
			compile(reg_class))
		it_err_compile(	'[a-]'		,()=>fatalCollect(3,[
			err_classChar(3),err_classChar(2),err_qseq(2),err_txt(2,']'),err_txt(0,'.')]),
			compile(reg_class))
		it_compile(		'[a\\-]'	,/[a\-]/											,
			compile(reg_class))
	})
})
//}
//{	bnf_class ::= `.` | `[``^`? spcs (bnf_classChar(`-`bnf_classChar)? spcs |quotedSequence spcs)*`]` 
//	/ *=>new RegExp(arg)* /;
var bnf_class = any(
	txt('.'),
	seq(need_all, 
		txt('['), opt(txt('^'),''), spcs, 
		rep(any( 
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
test.add_test('/symbolTokens','bnf_class',(path)=>{
	describe('bnf_class ::= `.` | `[``^`? spcs (bnf_classChar(`-`bnf_classChar)? spcs \
|quotedSequence spcs)*`]`; || возвращает регексп (без галки вначале)',()=>{
		it_compile('[ \\a \\b \\c ]',/[abc]/,compile(bnf_class))
	});
})
//}

var err_link = (x)=>new FatalError(x,'ожидалась ссылка');
exports.err_link = err_link;
//{	reg_link ::= `$`  ( ?id=identifier | `{` (?id=identifier) `}` ) /*=>{link:arg.id}* /;
// возвращает ссылку на паттерн
var reg_link = seq(need(1),txt('$'),
	any(identifier,
		seq(need(1),txt('{'),identifier,txt('}')))
).then(id=>({link:id}),err_link);
//}
//{ bnf_link ::= `$`? ( ?id=identifier | `{` (?id=identifier) `}` ) /*=>{link:arg.id}* /;
var bnf_link = seq(need(1),opt(txt('$')),
	any(identifier,
		seq(need(1),txt('{'),identifier,txt('}')))
).then(id=>({link:id}),err_link);
//}
/* todo так и остаются, но через sequence & alternatives накапливаются и доходят до корня, 
	чтобы можно было осуществить проверку на битые ссылки*/
	
//	reg_symbol ::= reg_char|quotedSequence|reg_class|reg_link;
//	bnf_symbol ::= bnf_char|quotedSequence|bnf_class|bnf_link;
// возвращает строку или регексп или ссылку на паттерн
var reg_symbol = any(reg_char,quotedSequence,reg_class,reg_link).then(0,err_char);
var bnf_symbol = any(bnf_char,quotedSequence,bnf_class,bnf_link).then(0,err_char);

//}

//{ ==== другие токены: квантификаторы, модификаторы, обработчики ====
test.add_category('/','otherTokens','');

//{	quantifier ::= [`*+?`] | `{` spcs (`,` spcs num | num (spcs `,` spcs num?)? ) spcs `}` ;
//	|| возвращет объект {min:int,max:int}
var err_quant = (x)=>new FatalError(x,'ожидался квантификатор');
exports.err_quant = err_quant;
var quantifier = any(
	txt('*').then(()=>({min:0,max:Infinity})),
	txt('+').then(()=>({min:1,max:Infinity})),
	txt('?').then(()=>({min:0,max:1})),
	seq(need(2),txt('{'),spcs,
		any(
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
test.add_test('/otherTokens','quantifier',(path)=>{
	describe('quantifier ::= [`*+?`] | `{`$spcs(`,`$spcs$num|$num($spcs`,`$spcs$num?)?)$spcs`}`;\
 || пока только энергичные;  возвращет объект {min:int,max:int}',()=>{
		it_compile('+'		,{min:1,max:Infinity}	,compile(quantifier))
		it_compile('{3,5}'	,{min:3,max:5}			,compile(quantifier))
		it_compile('{3}'	,{min:3,max:3}			,compile(quantifier))
		it_compile('{3,}'	,{min:3,max:Infinity}	,compile(quantifier))
		it_compile('{,3}'	,{min:0,max:3}			,compile(quantifier))
		it_compile('{ 3 , 5 }',{min:3,max:5}		,compile(quantifier))
	})
})
//}

/* modifier ::= `?` (| `!` | identifier `->` | identifier? `=` | `toString:` |)
	(	`!`              || отрицание
	|	identifier  `->` || back_pattern - то, что будет прочитано, превратиться в константу, и потом этот identifier можно будет вызывать как нетерминал
	|	identifier? `=`  || имя последовательности - имя результата
	|	`toString:`      || директива, преобразующая объектную последовательность в строковую
	);
*/
//{	|| возвращет объект {type:string[,data:id]}
/* #todo
back_pattern - создает предложение с именем, равным заданному идентификатору, 
и паттерном, равному результату этой группы (его можно указывать только в конкатенирующих группах).
После чего, на такое предложение можно ссылаться обычным образом $id.
При добавлении предложений идет проверка, чтоб их имена были разными.
В этот же момент идет такое же добавление back_pattern-ов с такой же проверкой, 
	и назначением значения, равного '';
*/
var modifier = seq(need(1), txt('?'), any(
	txt('!').then(r=>({type:'not'})),
	seq(need(0),identifier,txt('->')).then(s=>({type:'back_pattern',data:s})),   // на будущее
	seq(need(0),opt(identifier,''),txt('=')).then(s=>({type:'returnname',data:s})),
	txt('toString:').then(s=>({type:'toString'}))
)).then(0,(x,e)=>err_in(x,'modifier',e));
test.add_test('/otherTokens','modifier',(path)=>{
	describe('modifier ::= `?` (`!` | identifier`->` |	identifier?`=` | `toString:` ); || возвращет объект {type:string[,data:id]}'
	,()=>{
		describe('(|отрицание|) `!` (| при удачном прочтении этой скобочной группы возвращается ошибка, а при неудачном - {err:"continue"} - чтобы если такой результат получит $alternatives, то он продолжил перебирать альтернативы, но если удачных альтернатив больше нет, а некоторый результат уже есть, то он будет возвращен. а $sequence считает, как будто это пустая строка |)',()=>{
			it_compile('?!',{type:"not"},compile(modifier))
		})
		describe('(|back_pattern|) $identifier`->` (| после разбора этого паттерна создается ссылка с этим именем, и паттерном (ввиде строки), равным результату прочтения этого паттерна. Следовательно back_pattern можно указывать только в конкатенирующих последовательностях |)',()=>{
			it_compile('?identifier->',{type:"back_pattern",data:"identifier"},compile(modifier))
		})
		describe('(|имя последовательности|) $identifier?`=` (| в объекте родительской последовательности создает свойство с этим именем, и присваивает туда результат. Если имя пустое, то результат присваивается непрямую в родительский объект. |)',()=>{
			it_compile('?identifier=',{type:"returnname",data:"identifier"},compile(modifier))
		})
		describe('`toString:` (| директива, преобразующая объектную последовательность в строковую |)',()=>{
			it_compile('?toString:',{type:"toString"},compile(modifier))
		})
		describe('?`код`< (| старый обработчик |)',()=>{
			it_err_compile('?`7`<',()=>new FatalError(1,'',[err_id(1),err_in_f(0,'modifier',[
				err_txt(1,'!'),err_id(1),err_txt(1,'='),err_txt(1,'toString:')
			])]),compile(modifier))
		})
	})
})
//}

//{ fake_handler ::= (`/*`|`/error*`)(?!`*``/`|.)*`*``/`;
//	|| fake_... - синтаксис такой же как у настоящего, только не происходит обработка
//	|| в `*``/` - `` не убран по тому, что иначе это будет воспринято концом комментария в js
//	|| возвращет объект {error:bool,code:string}
var handler = seq({
	error:any(txt('/*').then(()=>false),txt('/error*').then(()=>true)),
	type: opt(any(txt('?').then(()=>'default'),txt('=>').then(()=>'expr')),'code'),
	code: rep(exc(txt('*/'),rgx(/./).then(m=>m[0]))).then(merger),
	none: txt('*/')
}).then(({error,type,code},x)=>{
	if(type==='default')
		code = 'return arg.length==1?arg[0]:'+code;
	else if(type=='expr')
		code = 'return '+code;
	try {
		code = (new Function('arg','pos',code));
		//.bind(this/*!!!*/.handler_global_object); - устанавливается при вызове call(this,arg,pos)
	}
	catch(err) {
		return new ParseError(x,'синтаксическая ошибка в обработчике',err);
	}
	return {error,code}
});
var fake_handler_schema = {
	type: "object",
	requredProperties: {
		error: { type: "boolean" },
		code: { type: "string" }
	}
}
//}
//{	handler ::= fake_handler;
//	|| `/*код*``//*=>выр-е*``//*?выр-е по умолчанию*``//error*код*``//error*=>выр-е*``//error*?выр-е по умолчанию*``/`
//	|| возвращет объект {error:bool,code:Function}
/*
обработчики все имеют аргументы (arg, pos), 
в качестве this  - handler_global_object
error - означает, что обработчик вызовется для ошибки, и сможет изменить сообщение об ощибке.
возвращаемое значение является результатом или сообщением об ошибке.
кинутые исключения - записываются в modifier_throws и error_modifier_throws
	todo: сделать для каждого объекта свой
	а результат становится undefined, а если это обработка ошибки, то она не меняется
в any, rep & opt - чтоб создавали вместо global объект у которого __proto__ = global
в случае удачи - копировали свойства в global, неудачи - просто выкидывали этот объект
+ чтоб родительские свойства были const
*/
test.add_test('/otherTokens','handler',(path)=>{
	describe('handler ::= (`/*`|`/error*`)(?!`*``/`|.)*`*``/`;\
 || возвращает {type:"handler",error:bool,code:function}',()=>{
		function it_compile_fun(pattern,obj,arg,res,comment='') {
			it(comment+'"'+pattern+'" ---> '+JSON.stringify(obj)+'   |.data(): '+
				JSON.stringify(arg)+' --> '+JSON.stringify(res),
				()=>{
					var prpat = handler.exec(pattern); // prepared pattern
					assertPrepareDeepEqual(prpat,obj);
					assertPrepareDeepEqual(prpat.code(arg),res);
				}
			);
		}
		it_compile_fun('/error*=>"hello world"*/',
			{error:true,code:function(arg,pos){ return "hello world";}},
			'',"hello world",'обработчик ошибки: ')
		it_compile_fun('/*=>"hello world"*/',
			{error:false,code:function(arg,pos){ return "hello world";}},
			'',"hello world",'если в `` нет {}, то это помещается в {return ...}')
		it_compile_fun('/*{return "hello world"}*/',
			{error:false,code:function(arg,pos){ return "hello world";}},
			'',"hello world",'если в `` есть {}, то оно остается неизменным')
		it_err_compile('/*=>{return return}*/',()=>new ParseError(0,
				"синтаксическая ошибка в обработчике",
				new SyntaxError("Unexpected token return")
			),compile(handler),'синтаксическая ошибка в обработчике: '
		)
		describe('complicated object',()=>{
			it_compile_fun('/*=>{x1:"hello world",x2:{complicated:"{{{}{}}}}}}{}{}}{"}}*/',
				{	error:false,
					code:function(arg,pos){
						return {x1:"hello world",x2:{complicated:"{{{}{}}}}}}{}{}}{"}}
					},
				},
				'',{x1:"hello world",x2:{complicated:"{{{}{}}}}}}{}{}}{"}}
			)
			it_compile_fun('/error*=>{x1:"hello world",x2:{complicated:"{{{}{}}}}}}{}{}}{"}}*/',
				{	error:true,
					code:function(arg,pos){
						return {x1:"hello world",x2:{complicated:"{{{}{}}}}}}{}{}}{"}}
					},
				},
				'',{x1:"hello world",x2:{complicated:"{{{}{}}}}}}{}{}}{"}}
			)
			it_compile_fun('/*=>"hello world"*/',
				{error:false,code:function(arg,pos){ return arg.length==1?arg[0]:"hello world";},},
				[],"hello world")
		})
	})
})
//}

//}

//{ ==== синтаксис ядра ====
var pos_adder = (m,x)=>{m.pos = x; return m;};

var err_reg_sequence = (x,e)=>err_in(x,'reg_sequence',e);
exports.err_reg_sequence = err_reg_sequence;
var err_seq_c_modifiers = x=>new ParseError(x,'модификаторы и обработчики цикла можно задавать только для цикла');
exports.err_seq_c_modifiers = err_seq_c_modifiers;

/* reg_sequence ::=
	modifier* handler*
	(	(	reg_symbol
		|	`(`      (modifier* `//`)?             reg_alternatives   (`//` spcs (handler spcs)*)?`)`
		)
		quantifier?
	)+
	(handler spcs)*;
*/
Parser.prototype.read_reg_sequence = function(str,pos) {
	var data = seq({
		modifiers: rep(modifier.then(pos_adder)), // модификаторы
		begin_handlers: rep(handler.then(pos_adder)),
		patterns: rep(seq({
				pattern: any( // паттерны
					reg_symbol.then((symbol,x)=>(
						(typeOf(symbol)==='object' && 'link' in symbol)
						? {type:'link',link:symbol.link,pos:x}
						: {type:'symbol',symbol,pos:x}
					)),
					seq({
						none1: txt('('),
						cycle_modifiers: opt(seq(need(0),rep(modifier.then(pos_adder)),txt('//')),[]),
						ret_pattern: this.reg_alternatives,
						cycle_handlers: opt(seq(need(2),
							txt('//'),
							spcs,
							rep(seq(need(0),handler.then(pos_adder),spcs))),[]),
						end: txt(')').then((m,x)=>x)
					}).then((pattern,x)=>{
						pattern.type="pattern"
						pattern.pos = x;
						return pattern;
					})
				),
				quant: opt(quantifier.then(pos_adder),null)
		}).then(({pattern,quant},x)=>{
			if(pattern.type === 'pattern') {
				if(quant) {
					pattern.type = 'cycle';
					pattern.quant = quant
				}
				else if(pattern.cycle_modifiers.length>0 || pattern.cycle_handlers.length>0)
					return err_seq_c_modifiers(x);
				else {
					delete pattern.cycle_modifiers;
					delete pattern.cycle_handlers;
				}
			}
			else
				pattern.quant = quant
			return pattern;
		}),{min:1}),
		handlers: rep(seq(need(0),handler.then(pos_adder),spcs))
	}).then(undefined,err_reg_sequence).exec(str,pos);
	return isGood(data) ? this.sequence_compile(data,pos.x) : data;
}
// Parser.reg_sequence = new Pattern(this.read_reg_sequence.bind(this)); - в конструкторе

// reg_alternatives ::= reg_sequence (`|` reg_sequence)*;
Parser.prototype.read_reg_alternatives = function(str,pos) {
	var data = seq(need_all,this.reg_sequence,rep(seq(need(1),txt('|'),this.reg_sequence))).exec(str,pos);
	return isGood(data) ? this.alternatives_compile(data,pos.x) : data;
}
// Parser.reg_alternatives = new Pattern(this.read_reg_alternatives.bind(this)); - в конструкторе

/* bnf_sequence_ ::=
	(modifier spcs)* (handler spcs)*
	(	(	bnf_symbol
		|	`(` spcs ((modifier spcs)* `//` spcs)? bnf_alternatives_  (`//` spcs (handler spcs)*)? `)`
		)	spcs
		(quantifier spcs)?
	)+
	(handler spcs)*;
*/
Parser.prototype.read_bnf_sequence_ = function(str,pos) {
	var data = seq({
		modifiers: rep(seq(need(0),modifier.then(pos_adder),spcs)), // модификаторы
		begin_handlers: rep(seq(need(0),handler.then(pos_adder),spcs)),
		patterns: rep(seq({
				pattern: any( // паттерны
					reg_symbol.then((symbol,x)=>(
						(typeOf(symbol)==='object' && 'link' in symbol)
						? {type:'link',link:symbol.link,pos:x}
						: {type:'symbol',symbol,pos:x}
					)),
					seq({
						none1: txt('('),
						none2: spcs,
						cycle_modifiers: opt(seq(need(0),rep(
							seq(need(0),modifier.then(pos_adder),spcs)),txt('//'),spcs),[]),
						ret_pattern: this.bnf_alternatives_,
						cycle_handlers: opt(seq(need(2),
							txt('//'),
							spcs,
							rep(seq(need(0),handler.then(pos_adder),spcs))),[]),
						end: txt(')').then((m,x)=>x),
						none3:spcs
					}).then((pattern,x)=>{
						pattern.type="pattern"
						pattern.pos = x;
						return pattern;
					})
				),
				none:  spcs,
				quant: opt(seq(need(0),quantifier.then(pos_adder),spcs),null),
		}).then(({pattern,quant},x)=>{
			if(pattern.type === 'pattern') {
				if(quant) {
					pattern.type = 'cycle';
					pattern.quant = quant
				}
				else if(pattern.cycle_modifiers.length>0 || pattern.cycle_handlers.length>0)
					return err_seq_c_modifiers(x);
				else {
					delete pattern.cycle_modifiers;
					delete pattern.cycle_handlers;
				}
			}
			else
				pattern.quant = quant
			return pattern;
		}),{min:1}),
		handlers: rep(seq(need(0),handler.then(pos_adder),spcs))
	}).then(undefined,err_reg_sequence).exec(str,pos);
	return isGood(data) ? this.sequence_compile(data,pos.x) : data;
}
// Parser.bnf_sequence_ = new Pattern(this.read_bnf_sequence_.bind(this)); - в конструкторе

// bnf_alternatives_ ::= bnf_sequence_ (`|` spcs bnf_sequence_)*;
Parser.prototype.read_bnf_alternatives_ = function(str,pos) {
	var data = seq(need_all,this.bnf_sequence_,rep(seq(need(2),txt('|'),spcs,this.bnf_sequence_))).exec(str,pos);
	return isGood(data) ? this.alternatives_compile(data,pos.x) : data;
}
// Parser.bnf_alternatives_ = new Pattern(this.read_bnf_alternatives_.bind(this)); - в конструкторе
	
//}

//{ схемы (по сути просто комментарии):
var symbol_schema = {
	oneOf: [
		{ type:"string", minLength: 1 },
		{ format:"regexp" },
		{
			type:"object",
			requredProperties: { link: { type:"string", minLength: 1 } }
		}
	]
}
var reduced_symbol_schema = {
	oneOf: [
		{ type:"string", minLength: 1 },
		{ format:"regexp" }
	]
}
var quantifier_schema = {
	type: 'object',
	requiredProperties:{
		min:{ type:'integer' },
		max:{ type:'integer' }
	}
}
var modifier_schema = {
	type:'object',
	oneOf:[
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
};
var handler_schema = {
	type: "object",
	requredProperties: {
		error: { type: "boolean" },
		code: { format: "function" }
	}
}
var sequence_schema = {
	definitions: {
		pos_modifier_schema: {
			requiredProperties: {
				pos: { type:"integer" }
			},
			additionalAllOf: [{ $ref: "modifier_schema" }]
		},
		modifiers_schema: {
			type: "array",
			items: { $ref: "#/definitions/pos_modifier_schema" }
		},
		pos_handler_schema: {
			requiredProperties: {
				pos: { type:"integer" }
			},
			additionalAllOf: [{ $ref: "handler_schema" }]
		},
		handlers_schema: {
			type: "array",
			items: { $ref: "#/definitions/pos_handler_schema" }
		},
		pos_quantifier_schema: {
			reqiredProperties: {
				pos: { type:"integer" }
			},
			additionalAllOf: [{ $ref: "quantifier_schema" }]
		}
	},
	type: "object",
	requiredProperties: {
		modifiers: { $ref: "#/definitions/modifiers_schema" },
		begin_handlers: { $ref: "#/definitions/handlers_schema" },
		handlers: { $ref: "#/definitions/handlers_schema" },
		patterns: {
			type: "array",
			minItems:1,
			items: {
				oneOf: [
					{ // symbol
						type:"object",
						requiredProperties: {
							type: { enum:["symbol"] },
							symbol: { $ref: "reduced_symbol_schema" },
							pos: { type: "integer" },
							quant: {
								oneOf: [
									{ type:"null" },
									{ $ref: "#/definitions/pos_quantifier_schema" }
								]
							}
						}
					},
					{ // link
						type:"object",
						requiredProperties: {
							type: { enum:["link"] },
							link: { type:'string', format:'identifier' },
							pos: { type: "integer" },
							quant: {
								oneOf: [
									{ type:"null" },
									{ $ref: "#/definitions/pos_quantifier_schema" }
								]
							}
						}
					},
					{ // pattern
						type:"object",
						requiredProperties: {
							type: { enum:["pattern"] },
							pos: { type: "integer" },
							end: { type: "integer" },
							ret_pattern: { $ref: "ret_pattern_schema" }
						}
					},
					{ // cycle
						type:"object",
						requiredProperties: {
							type: { enum:["cycle"] },
							pos: { type: "integer" },
							end: { type: "integer" },
							ret_pattern: { $ref: "ret_pattern_schema" },
							quant: { $ref: "#/definitions/pos_quantifier_schema" },
							cycle_modifiers: { 
								allOf: [
									{ $ref: "#/definitions/modifiers_schema" },
									{ minItems:1 }
								]
							},
							cycle_handlers: { 
								allOf: [
									{ $ref: "#/definitions/handlers_schema" },
									{ minItems:1 }
								]
							}
						}
					}
				]
			}
		}
	}
};
var ret_pattern_schema = {
	type: "object",
	requiredProperties: {
		mode: {/*...*/},
		fun: {/*...*/},
		direct: {/*...*/}
	}
}

//}

//{ ==== ядро ====
/* есть 3 типа "функций":
	последовательность (символов, "функций" и т.д.)
		может иметь идущие в начале модификаторы, каждый начинается с ?
		и идущие в конце обработчики, заключенные в / * * /
	перечисление альтернатив-последовательностей (через |)
	цикл/массив - скобки с квантификатором
		также может иметь свои (которые относятся к массиву в целом) модификаторы и обработчики
		которые отделяются от модификаторов и обработчиков внутренней последовательности(тей)
		при помощи //
каждая функция или конкатенирующая или объектная
	это не имеет значения для перечисления
	конкатенирующая последовательность/цикл
		конкатенирует результаты функций следующего уровня (предварительно их JSON.stringify-цируя)
		последовательность длины 1 возвращает результат функции следующего уровня не производя над ним ни каких операций
		последовательность длины 0 возвращает пустую строку
	объектная последовательность - создает объект, названия полей совпадают с именами, указанными в ?name=
		а их значения соответствуют результатам соответствующих функций
	объектный цикл возвращает массив
каждая функция 
	имеет тип cat(т.е. строковая) или obj
	может иметь атрибут direct
=== как функции возвращают результат ===
	функции* у которых задано непустое имя при успешном завершении
		у переданного им объекта создают свойство с этим именем
		и присвивают туда свой объект** или строку**
	функции* у которых задано пустое (т.е. они direct) имя при успешном завершении
		заменяют переданный им объект своим объектом** или строкой**
	конкатенирующие функции* у которых не задано имя при успешном завершении
		заменяют переданный им объект своей строкой**
	объектные функции* у которых не задано имя при успешном завершении
		копируют все свойства своего объекта(тут нет сноски, это именно объект) в переданный им объект
		но объектные циклы у которых не задано имя при успешном завершении
			заменяют переданный им объект своим массивом
	перечисления передают переданный им объект на прямую в каждую альтернативу-перечисление
=== как функции получают результат ===
	конкатенирующие функции* передают-получают результаты по ссылке
	объектные функции* передают свой объект для модификации только в объектные функции, 
		а в конкатенирующие - фейковый объект, который не используется
	объектные циклы на каждой итерации создают и передают объект для модификации
		после чего добавляют его в свой массив, который является результирующим объектом
=== определение типа функции, и какой она является ===
	символы (в т.ч. ссылки на паттерны) имеют тип 'cat' и не имеют атрибута direct
		но если функция* состоит только из одной ссылки на паттерн и у нее задано (возможно пустое) имя, 
			то она является объектной
	функция имеет тип obj, если у нее задано (возможно пустое) имя или она является объектной, 
		в противном случае она имеет тип cat
	но если функция* имеет модификатор ?toString: то она все равно имеет тип cat
	если в функции* имеется модификатор ?!(не), то она всегда имеет тип cat, 
		и всегда возвращает в случае НЕудачного завершения
			пустую строку в качестве результата
			и {err:'continue'} вместо true в качестве ошибки, т.е. удачности результата (это внутреннее)
	функция является объектной, если хотябы одна из функций, которую она вызывает, 
		имеет тип obj, иначе функция является конкатенирующей

	объектная функция* может иметь обработчики результата только если имеет (возможно пустое) имя

	функции*, у которых задано пустое имя
		имеют атрибут direct
	если функция* вызывает хотябы одну функцию, которая direct
		то она обязана иметь (возможно пустое) имя
			но если имя не указано, считается, как будто указано пустое имя
	если цикл является объектным, он обязан иметь (возможно пустое) имя или атрибут toString
		
	* - последовательности и циклы
	** - перед возвращением модификатор-обработчик может превратить
		объект или строку в значение любого типа
*/
/*	=== описание обработчиков ===
	каждая последовательность обработчиков независима
	если в результате разбора получился результат
		идет очередь обработчиков результата
		если в результате одного из обработчиков возникла фатальная ошибка
			очередь останавливается, и возвращаются все накопленные ошибки, обернутые* в фатальную ошибку
		если в результате одного из обработчиков возникла парсинговая ошибка
			очередь останавливается, и ошибка добавляется массив парсинговых ошибок
		если в одном из обработчиков возникло прерывание
			очередь останавливается, прерывание обертывается в парсинговаую ошибку (с позицией в тексте и в коде),
			и ошибка добавляется массив парсинговых ошибок
	если в результате разбора получилась парсинговая или фатальная ошибка
		идет очередь обработчиков ошибок
		если обработчик получил фатальную ошибку, а вернул парсинговую ошибку
			очередь останавливается, 
			парсинговая ошибка обертывается* в фатальную ошибку (с позицией в тексте и в коде),
			и возвращаются все накопленные ошибки
		получить парсинговую ошибку а вернуть не ошибку - допустимо
		если в одном из обработчиков возникло прерывание
			очередь останавливается, 
			прерывание обертывается* в парсинговаую или фатальную ошибку (с позицией в тексте и в коде)
				(в зависимости от типа ошибки, которая попала на вход обработчика),
			и возвращаются все накопленные ошибки или ошибка добавляется массив парсинговых ошибок
				(в зависимости от типа ошибки, которая попала на вход обработчика),
	если в конце имеются парсинговые ошибки, они оборачиваются* парсинговую ошибку, которая затем возвращается
	* - обертывание:
		одна ошибка не обертывается и возвращается как есть
		2 и более обертываются с указанием имени (если есть) или 'undefined' (err_in)
	при выходе из предложения БНФ любая ошибка также обертывается(даже одна) в err_in(имя предложения)
			
	вначале каждой последовательности выполняются begin_hendlers (очередь ошибок игнорируется)
		а также игнорируются результаты undefined
		
*/
// выходной результат или ошибка handle(входная ошибка, входной результат, позиция в тексте, 
//	обработчики, обработчики ошибок)
function handle(err,res,pos,self,handlers,error_handlers) {
	if(!error_handlers) { // случай begin_handlers
		for(var i=0; i<handlers.length; i++) {
			try{
				res = handlers[i].code.call(self.handler_global_object,res,pos);
			}
			catch(e) {
				return new ParseError(pos,'Произошло исключение в обработчике на позиции '+handlers[i].pos,e)
			}
			if(res!==undefined && !isGood(res))
				return res;
		}
	}
	else if(isGood(err)) {
		for(var i=0; i<handlers.length; i++) {
			try{
				res = handlers[i].code.call(self.handler_global_object,res,pos);
			}
			catch(e) {
				return new ParseError(pos,'Произошло исключение в обработчике на позиции '+handlers[i].pos,e)
			}
			if(!isGood(res))
				return res;
		}
		return res;
	}
	else {
		var type = isFatal(err); // true не должно поменяться на false
		for(var i=0; i<error_handlers.length; i++) {
			try{
				err = error_handlers[i].code.call(self.handler_global_object,err,pos);
			}
			catch(e) {
				if(type)
					return new FatalError(pos,'Произошло исключение в обработчике на позиции '+
						error_handlers[i].pos,e);
				else
					return new ParseError(pos,'Произошло исключение в обработчике на позиции '+
						error_handlers[i].pos,e);
			}
			if(type && !isFatal(err))
				return new FatalError(pos,'Обработчик получил фатальную ошибку, а вернул не фатальную на позиции '+
						error_handlers[i].pos,e);
			type = isFatal(err); // true не должно поменяться на false
		}
		return err;
	}
}

/*	=== как функции возвращают результат ===
	функции* у которых задано непустое имя при успешном завершении
		у переданного им объекта создают свойство с этим именем
		и присвивают туда свой объект** или строку**
	функции* у которых задано пустое имя при успешном завершении
		заменяют переданный им объект своим объектом** или строкой**
	конкатенирующие функции* у которых не задано имя при успешном завершении
		заменяют переданный им объект своей строкой**
	объектные функции* у которых не задано имя при успешном завершении
		копируют все свойства своего объекта(тут нет сноски, это именно объект) в переданный им объект
*/
function set_res_cat(res,inres_res,name) {
	if(typeof name === 'string') {
		if(name==='')
			res.res = inres_res;
		else {
			if(typeOf(res.res)!='object') throw new Error('Cannot set property '+name+' of '+res.res);
			res.res[name] = inres_res;
		}
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
		else {
			if(typeOf(res.res)!='object') throw new Error('Cannot set property '+name+' of '+res.res);
			res.res[name] = inres_res;
		}
	}
	else if(name === null) {
		if(typeOf(res.res)!='object') throw new Error('Cannot set properties of '+res.res);
		for(var i in inres_res)
			res.res[i] = inres_res[i]
	}
	else throw new Error('неизвестный тип name')
}

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

var perr_double_names = x=>new ParseError(x,'повторно заданное имя');
var perr_double_bpatterns = x=>new ParseError(x,'повторно заданное имя обратного паттерна');
var perr_obj_handlers = x=>new ParseError(x,'объектная последовательность может иметь обработчики, только если указано (возможно пустое) имя');
var perr_begin_error_handler = x=>new ParseError(x,'среди стартовых обработчиков не должно быть обработчиков ошибки');
var perr_cycle_name = x=>new ParseError(x,'объектный цикл должен иметь (возможно пустое) имя')
var err_fail_not = (x,name)=> new FatalError(x,'удалось прочитать то, что не должно быть прочитано: '+name)
var err_rgxx = (x,text,pos)=>new FatalError(x,'text not match regexp /'+text+'/ at '+pos);
var err_any = (x,why)=>new FatalError(x,'alternatives:',why);
var err_not_obj = (X,pattern_x,e)=>new ParseError(X,'res.res не является объектом (скорее всего) на '+pattern_x,e);

var perr_cycle_bp = x=>new ParseError(x,'цикл не может содержать back_pattern');

exports.perr_double_names = perr_double_names;
exports.perr_double_bpatterns = perr_double_bpatterns;
exports.perr_obj_handlers = perr_obj_handlers;
exports.perr_begin_error_handler = perr_begin_error_handler;
exports.err_fail_not = err_fail_not;
exports.err_rgxx = err_rgxx;

Parser.prototype.cycle_compile = function/*на самом деле procedure*/ cycle_compile(pattern) {
	var {type,pos,end,ret_pattern,quant,cycle_modifiers,cycle_handlers} = pattern;
	var pattern_x = pattern.pos;
	delete pattern.quant;
	delete pattern.cycle_modifiers;
	delete pattern.cycle_handlers;
	pattern.type = 'pattern';
	// pattern.ret_pattern - в конце
	
// 1) подбирает, какую функцию вернуть, а также возвращает режим (mode: cat/obj, direct:true/false)
// 2) каждая из этих функций использует замыкание на данную(sequence_compiler) функцию

	var self = this;
	var parse_errors = [];
	
	//{ cycle_handlers -> cycle_handlers, cycle_error_handlers
	var cycle_error_handlers = [];
	for(var i=cycle_handlers.length-1; i>=0; i--)
		if(cycle_handlers[i].error) {
			cycle_error_handlers.unshift(cycle_handlers[i]);
			cycle_handlers.splice(i,1);
		}
	//}

	//{ cycle_modifiers -> not, name, toString, back_pattern
	var not = false;
	var name = null;     // null - не указано, '' - указано пустое
	var toString = false;
	var back_pattern = null;
	for(var i = 0; i<cycle_modifiers.length; i++) {
		if(cycle_modifiers[i].type==='returnname') {
			if(name!==null)
				parse_errors.push(perr_double_names(cycle_modifiers[i].pos));
			name = cycle_modifiers[i].data;
		}
		else if(cycle_modifiers[i].type==='back_pattern') {
			if(back_pattern!==null)
				parse_errors.push(perr_double_bpatterns(cycle_modifiers[i].pos));
			back_pattern = cycle_modifiers[i].data;
		}
		else if(cycle_modifiers[i].type==='not') {
			not = !not;
		}
		else if(cycle_modifiers[i].type==='toString') {
			toString = true;
		}
	}
	//}
	
	//	символы (в т.ч. ссылки на паттерны) имеют тип 'cat' и не имеют атрибута direct
	var mode = 'cat'; // конкатенирующая или объектная (не тип cat/obj)
	var has_direct = -1;// позиция используется в сообщениях об ошибках

	//{ обрабатываем ret_pattern ; выставляем mode и has_direct
	if(ret_pattern.mode==='obj') mode = 'obj';
	if(has_direct<ret_pattern.direct) has_direct = ret_pattern.direct;
	// если цикл является объектным, он обязан иметь (возможно пустое) имя или атрибут toString
	if(mode==='obj' && name===null && !toString) 
		parse_errors.push(perr_cycle_name(pos));
	// регистрируем
	if(back_pattern) { 
		
	}
	//	объектная функция* может иметь обработчики результата только если имеет (возможно пустое) имя
	if(mode==='obj' && cycle_handlers.length>0 && name===null)
		parse_errors.push(perr_obj_handlers(pattern_x));
	//}

	//{	=== определение типа функции, и какой она является === (и return)
	// накопленные ошибки
	if(parse_errors.length>0) {
		if(parse_errors.length===1)
			return parse_errors[0];
		else
			return new ParseError(pattern_x,'',parse_errors);
	}
	
	var e_cycle = mode ==='obj' ? obj_cycle : cat_cycle;
	//	если в функции* имеется модификатор ?!(не), то она всегда имеет тип cat, 
	//		и всегда возвращает в случае НЕудачного завершения
	//			пустую строку в качестве результата
	//			и {err:'continue'} вместо true в качестве ошибки, т.е. удачности результата (это внутреннее)
	function make_not(fun,name) {
		return function not_function(str,pos,res) {
			var x = pos.x;
			var r = fun(str,pos,res);
			pos.x = x;
			res.res = '';
			return !isGood(r) ? /*OK,but*/{err:"continue"} : err_fail_not(x,name); // всегда попадет в alternatives
		}
	}
	if(not) {
		pattern.ret_pattern = {
			fun:make_not(e_cycle,name===null?'безымянная последовательность':name),
			mode:'cat',
			not:true,
			direct:-1
		};
	}
	else {
		/*
		функция имеет тип obj, если у нее задано (возможно пустое) имя или она является объектной, 
			в противном случае она имеет тип cat
		но если функция* имеет модификатор ?toString: то она все равно имеет тип cat

		функции*, у которых задано пустое имя
			имеют атрибут direct
		*/
		pattern.ret_pattern = {
			fun:e_cycle,
			mode:(toString ? 'cat' : mode==='obj' || name!==null ? 'obj' : 'cat'),
			direct:(name==='' ? pattern_x : -1) // позиция используется в сообщениях об ошибках
		};
		//console.log(name)
	}
	return true;
	//}

	/*	конкатенирующие циклы передают-получают результат по ссылке и конкатенируют его 
			(предварительно приведя к строке JSON, если это не строка)
	*/
	function cat_cycle(str,pos,res) { // name, compressed_patterns, handlers, error_handlers, self - closure
		var X = pos.x; // используется в сообщениях об ошибках
		var inres = [];
		var parse_errs = [];
		var handler_object = {};
		handler_object.__proto__ = self.handler_global_object;
		self.handler_global_object = handler_object;
		function before_return(arg) {
			self.handler_global_object = self.handler_global_object.__proto__;
			return arg;
		}
		
		var i=0;
		for(; i<quant.min; i++) {
			// #todo надо как-то pos и end использовать
			/* если FatalError - возвращаем FatalError+обработка ошибок
				+ если задано name - обернуть в новый FatalError и завершить
			*/
			if(ret_pattern.mode!=='cat') throw new Error('происходит вызов объектного паттерна из конкатенирующего');
			var back_res = {res:{}}; 
				// паттерн может оказаться объектным, а он считает, что back_res.res уже объект
			var err = ret_pattern.fun(str,pos,back_res); // ВЫЗВАЛИ!
			var tmp = isGood(err) ? back_res.res : err;

			if(isGood(tmp)) {
				if(typeOf(tmp)!=='string') // если не строка, то stringifyцируем, 
					tmp=JSON.stringify(tmp);
				inres.push(tmp);
			}
			else if(notFatal(tmp)) parse_errs.push(tmp);
			else { // isFatal
				if(parse_errs.length>0){
					parse_errs.push(tmp);
					tmp = err_in_f(X,name?name:'unnamed group',parse_errs);
				}
				tmp = handle(tmp,undefined,X,self,cycle_handlers, cycle_error_handlers);
				return before_return(tmp);
			}
		}
		for(; i<quant.max; i++) {
			// #todo надо как-то pos и end использовать
			/* если FatalError - возвращаем FatalError+обработка ошибок
				+ если задано name - обернуть в новый FatalError и завершить
			*/
			if(ret_pattern.mode!=='cat') throw new Error('происходит вызов объектного паттерна из конкатенирующего');
			var back_res = {res:{}}; 
			var local_x = pos.x;
				// паттерн может оказаться объектным, а он считает, что back_res.res уже объект
			var err = ret_pattern.fun(str,pos,back_res); // ВЫЗВАЛИ!
			var tmp = isGood(err) ? back_res.res : err;

			if(isGood(tmp)) {
				if(typeOf(tmp)!=='string') // если не строка, то stringifyцируем, 
					tmp=JSON.stringify(tmp);
				inres.push(tmp);
			}
			else if(notFatal(tmp)) parse_errs.push(tmp);
			else {
				pos.x = local_x;
				// #todo parser_tail_error
				break;
			}
		}

		if(parse_errs.length>0){
			var tmp = err_in_p(X,name?name:'unnamed group',parse_errs);
			tmp = handle(tmp,undefined,X,self,cycle_handlers, cycle_error_handlers);
			return before_return(tmp);
		}
		else{
			var tmp = inres.join('');
			tmp = handle(true,tmp,X,self,cycle_handlers, cycle_error_handlers);
			try{
				set_res_cat(res,tmp,name);
			}
			catch(e){
				return err_not_obj(X,pattern_x,e)
			}
			return before_return(true);
		}
	}
	/*	объектные циклы на каждой итерации создают и передают объект для модификации
			после чего добавляют его в свой массив, который является результирующим объектом
	*/
	function obj_cycle(str,pos,res) { // name, compressed_patterns, handlers, error_handlers, self - closure
		var X = pos.x; // используется в сообщениях об ошибках
		var inres = [];
		var parse_errs = [];
		var handler_object = {};
		handler_object.__proto__ = self.handler_global_object;
		self.handler_global_object = handler_object;
		function before_return(arg) {
			self.handler_global_object = self.handler_global_object.__proto__;
			return arg;
		}

		var i=0;
		for(; i<quant.min; i++) {
			var back_res = {res:{}};

			var err = ret_pattern.fun(str,pos,back_res); // ВЫЗВАЛИ!

			if(isGood(err)) {
				inres.push(back_res.res);
			}
			else if(notFatal(tmp)) 
				parse_errs.push(tmp);
			else { // isFatal
				var tmp;
				if(parse_errs.length>0){
					parse_errs.push(tmp);
					tmp = err_in_f(X,name?name:'unnamed group',parse_errs);
				}
				tmp = handle(tmp,undefined,X,self,handlers, error_handlers);
				return before_return(tmp);
			}
		}
		for(; i<quant.max; i++) {
			var back_res = {res:{}};
			var local_x = pos.x;

			var err = ret_pattern.fun(str,pos,back_res); // ВЫЗВАЛИ!

			if(isGood(err)) {
				inres.push(back_res.res);
			}
			else if(notFatal(tmp)) 
				parse_errs.push(tmp);
			else { // isFatal
				pos.x = local_x;
				// #todo parser_tail_error
				break;
			}
		}

		if(parse_errs.length>0){
			var tmp = err_in_p(X,name?name:'unnamed group',parse_errs);
			tmp = handle(tmp,undefined,X,self,handlers, error_handlers);
			return before_return(tmp);
		}
		else{
			if(name===null && cycle_handlers.length>0) throw new Error('объектная последовательность без имени имеет обработчик результата');
			var tmp = handle(true,inres,X,self,cycle_handlers, cycle_error_handlers);
			//set_res_obj(res,tmp,name); (res,inres_res,name)
			if(name==='' || name===null)
				res.res = tmp;
			else if(typeof name === 'string') {
				if(typeOf(res.res)!='object')
					return err_not_obj(X,pattern_x,e);
				res.res[name] = tmp;
			}
			else throw new Error('неизвестный тип name')
			
			return before_return(true);
		}
	}
}

Parser.prototype.sequence_compile = function sequence_compile({modifiers,begin_handlers,handlers,patterns},pattern_x) {
// 1) подбирает, какую функцию вернуть, а также возвращает режим (mode: cat/obj, direct:true/false)
// 2) каждая из этих функций использует замыкание на данную(sequence_compiler) функцию

	var self = this;
	var parse_errors = [];
	
	//{ handlers -> handlers, error_handlers; + проверка begin_handlers
	var error_handlers = [];
	for(var i=handlers.length-1; i>=0; i--)
		if(handlers[i].error) {
			error_handlers.unshift(handlers[i]);
			handlers.splice(i,1);
		}
	for(var i=begin_handlers.length-1; i>=0; i--)
		if(begin_handlers[i].error) { // обработчики ошибок среди начальных обработчиков игнорируются
			begin_handlers.splice(i,1);
			parse_errors.push(perr_begin_error_handler(begin_handlers[i].pos));
		}
	//}

	//{ modifiers -> not, name, toString, back_pattern
	var not = false;
	var name = null;     // null - не указано, '' - указано пустое
	var toString = false;
	var back_pattern = null;
	for(var i = 0; i<modifiers.length; i++) {
		if(modifiers[i].type==='returnname') {
			if(name!==null)
				parse_errors.push(perr_double_names(modifiers[i].pos));
			name = modifiers[i].data;
		}
		else if(modifiers[i].type==='back_pattern') {
			if(back_pattern!==null)
				parse_errors.push(perr_double_bpatterns(modifiers[i].pos));
			back_pattern = modifiers[i].data;
		}
		else if(modifiers[i].type==='not') {
			not = !not;
		}
		else if(modifiers[i].type==='toString') {
			toString = true;
		}
	}
	//}
	
	//	символы (в т.ч. ссылки на паттерны) имеют тип 'cat' и не имеют атрибута direct
	var mode = 'cat'; // конкатенирующая или объектная (не тип cat/obj)
	var has_direct = -1;// позиция используется в сообщениях об ошибках

	//{ patterns -> compressed_patterns; выставляем mode и has_direct
	/*	создаем массив паттернов, которые будет вызывать e_sequence:
		последовательность символов объединяем в один регексп
		для cycle создаем функцию и преобразуем в pattern (#todo)
	*/
	var compressed_patterns = [];
	var cache = [];
	var cache_pos =0;
	try{ patterns.forEach(m=>{
		if(m.type === 'symbol') {
			if(cache.length===0)
				cache_pos = m.pos;
			if(typeOf(m.symbol)==='string')
				cache.push(escaper(m.symbol)+(m.quant===null ? '' : minmaxToRegExp(m.quant)))
			else if(m.symbol instanceof RegExp)
				cache.push(m.symbol.source+(m.quant===null ? '' : minmaxToRegExp(m.quant)))
			else throw new Error('неизвестный тип символа');
		}
		else {
			if(cache.length>0)
				compressed_patterns.push({ 
					type:'compressed', 
					symbol:new RegExp('^'+cache.join('')),
					pos:cache_pos
				});
			cache = [];
			//	функция является объектной, если хотябы одна из функций, которую она вызывает, 
			//		имеет тип obj, иначе функция является конкатенирующей
			if(m.type === 'link') {
				compressed_patterns.push(m);
			}
			else if(m.type === 'pattern') {
				if(m.ret_pattern.mode==='obj') mode = 'obj';
				if(has_direct<m.ret_pattern.direct) has_direct = m.ret_pattern.direct;
				compressed_patterns.push(m);
			}
			else if(m.type === 'cycle') {
				var tmp_err = this.cycle_compile(m);
				if(isGood(tmp_err)) {
					console.assert(m.type==='pattern');
					if(m.ret_pattern.mode==='obj') mode = 'obj';
					if(has_direct<m.ret_pattern.direct) has_direct = m.ret_pattern.direct;
					compressed_patterns.push(m);
				}
				else {
					parse_errors.push(tmp_err);
				}
			}
			else throw new Error('неизвестный тип символа или паттерна или цикла: '+m.type);
		}
	}) }
	catch(err){
		if(err instanceof ParseError) parse_errors.push(err);
		else                          throw  err;
	}
	if(cache.length>0)
		compressed_patterns.push({ 
			type:'compressed', 
			symbol:new RegExp('^'+cache.join('')),
			pos:cache_pos
		});
	cache = [];
	//	если функция* вызывает хотябы одну функцию, которая direct
	//		то она обязана иметь (возможно пустое) имя
	//			но если имя не указано, считается, как будто указано пустое имя
	if(has_direct>=0 && name==null)
		name='';
	//	но если функция* состоит только из одной ссылки на паттерн и у нее задано (возможно пустое) имя, 
	//		то она является объектной
	if(compressed_patterns.length==1 && compressed_patterns[0].type=='link' && name!=null)
		mode = 'obj';
	// регистрируем
	if(back_pattern) { 
		
	}
	//	объектная функция* может иметь обработчики результата только если имеет (возможно пустое) имя
	if(mode==='obj' && handlers.length>0 && name===null)
		parse_errors.push(perr_obj_handlers(pattern_x));
	//}

	//{	=== определение типа функции, и какой она является === (и return)
	// накопленные ошибки
	if(parse_errors.length>0) {
		if(parse_errors.length===1)
			return parse_errors[0];
		else
			return new ParseError(pattern_x,'',parse_errors);
	}
	
	var e_sequence = mode ==='obj' ? obj_sequence : cat_sequence;
	//	если в функции* имеется модификатор ?!(не), то она всегда имеет тип cat, 
	//		и всегда возвращает в случае НЕудачного завершения
	//			пустую строку в качестве результата
	//			и {err:'continue'} вместо true в качестве ошибки, т.е. удачности результата (это внутреннее)
	function make_not(fun,name) {
		return function not_function(str,pos,res) {
			var x = pos.x;
			var r = fun(str,pos,res);
			pos.x = x;
			res.res = '';
			return !isGood(r) ? /*OK,but*/{err:"continue"} : err_fail_not(x,name); // всегда попадет в alternatives
		}
	}
	if(not) {
		return {
			fun:make_not(e_sequence,name===null?'безымянная последовательность':name),
			mode:'cat',
			not:true,
			direct:-1
		};
	}
	else {
		/*
		функция имеет тип obj, если у нее задано (возможно пустое) имя или она является объектной, 
			в противном случае она имеет тип cat
		но если функция* имеет модификатор ?toString: то она все равно имеет тип cat

		функции*, у которых задано пустое имя
			имеют атрибут direct
		*/
		return {
			fun:e_sequence,
			mode:(toString ? 'cat' : mode==='obj' || name!==null ? 'obj' : 'cat'),
			direct:(name==='' ? pattern_x : -1) // позиция используется в сообщениях об ошибках
		};
		console.log(name,tmp)
	}
	//}

	/* === как функции получают результат ===
		конкатенирующие функции* передают-получают результаты по ссылке
	*/
	function cat_sequence(str,pos,res) { // name, compressed_patterns, handlers, error_handlers, self - closure
		var X = pos.x; // используется в сообщениях об ошибках
		var inres = [];
		var parse_errs = [];
		var handler_object = {};
		handler_object.__proto__ = self.handler_global_object;
		self.handler_global_object = handler_object;
		function before_return(arg) {
			self.handler_global_object = self.handler_global_object.__proto__;
			return arg;
		}
		
		//{ begin_handlers
		var tmpres = handle(true,undefined,X,self,begin_handlers);
		if(tmpres!==undefined && isFatal(tmpres)) {
			parse_errs.push(tmpres);
			if(parse_errs.length===1)
				return before_return(parse_errs[0]);
			else
				return before_return(err_in_f(X,name?name:'unnamed group',parse_errs));
		}
		else if(tmpres!==undefined && !isGood(tmpres))
			parse_errs.push(tmpres);
		//}
		
		for(var i=0; i<compressed_patterns.length; i++) {
			var curpat = compressed_patterns[i]; // current_pattern
			var tmp;
			if(curpat.type==='compressed') {
				var m;
				if(m = curpat.symbol.exec(str.slice(pos.x))) {
					pos.x += m.index + m[0].length;
					tmp = m[0];
				}
				else
					tmp = err_rgxx(pos.x,curpat.symbol.source.slice(1),curpat.pos);
			}
			else if(curpat.type==='symbol') {
				if(curpat.symbol instanceof RegExp){
					var m;
					if(m = curpat.symbol.exec(str.slice(pos.x))) {
						tmp = m[0];
						pos.x += m.index + m[0].length;
					}
					else {
						tmp = err_rgxx(pos.x,curpat.symbol.source.slice(1),curpat.pos);
					}
				}
				else{
					var text = curpat.symbol;
					if (str.substr(pos.x, text.length) == text)	{
						tmp = text;
						pos.x += text.length;
					}
					else{
						tmp = err_txt(pos.x,text);
					}
				}
			}
			else if(curpat.type==='pattern') {
				// #todo надо как-то curpat.pos и curpat.end использовать
				/* если FatalError - возвращаем FatalError+обработка ошибок
					+ если задано name - обернуть в новый FatalError и завершить
				*/
				if(curpat.ret_pattern.mode!=='cat') throw new Error('происходит вызов объектного паттерна из конкатенирующего');
				var back_res = {res:{}}; 
					// паттерн может оказаться объектным, а он считает, что back_res.res уже объект
				var err = curpat.ret_pattern.fun(str,pos,back_res); // ВЫЗВАЛИ!
				tmp = isGood(err) ? back_res.res : err;
			}
			else if(compressed_patterns[i].type==='link') {	// #todo поиск функции, а потом вызов как при pattern
			}
			else throw new Error('неизвестный тип паттерна');
			
			if(isGood(tmp)) {
				if(typeOf(tmp)!=='string') // если не строка, то stringifyцируем, 
					tmp=JSON.stringify(tmp);
				inres.push(tmp);
			}
			else if(notFatal(tmp)) parse_errs.push(tmp);
			else { // isFatal
				if(parse_errs.length>0){
					parse_errs.push(tmp);
					tmp = err_in_f(X,name?name:'unnamed group',parse_errs);
				}
				tmp = handle(tmp,undefined,X,self,handlers, error_handlers);
				return before_return(tmp);
			}
		}
		
		if(parse_errs.length>0){
			var tmp = err_in_p(X,name?name:'unnamed group',parse_errs);
			tmp = handle(tmp,undefined,X,self,handlers, error_handlers);
			return before_return(tmp);
		}
		else{
			var tmp = inres.join('');
			tmp = handle(true,tmp,X,self,handlers, error_handlers);
			try {
				set_res_cat(res,tmp,name);
			}
			catch(e){
				return err_not_obj(X,pattern_x,e)
			}
			return before_return(true);
		}
	}
	/*	объектные функции* передают свой объект для модификации только в объектные функции, 
			а в конкатенирующие - фейковый объект, который не используется
	*/
	function obj_sequence(str,pos,res) { // name, compressed_patterns, handlers, error_handlers, self - closure
		var X = pos.x; // используется в сообщениях об ошибках
		var inres = {res:{}};
		var parse_errs = [];
		var handler_object = {};
		handler_object.__proto__ = self.handler_global_object;
		self.handler_global_object = handler_object;
		function before_return(arg) {
			self.handler_global_object = self.handler_global_object.__proto__;
			return arg;
		}

		//{ begin_handlers
		var tmpres = handle(true,undefined,X,self,begin_handlers);
		if(tmpres!==undefined && isFatal(tmpres)) {
			parse_errs.push(tmpres);
			if(parse_errs.length===1)
				return before_return(parse_errs[0]);
			else
				return before_return(err_in_f(X,name?name:'unnamed group',parse_errs));
		}
		else if(tmpres!==undefined && !isGood(tmpres))
			parse_errs.push(tmpres);
		//}
		
		for(var i=0; i<compressed_patterns.length; i++) {
			var curpat = compressed_patterns[i]; // current_pattern
			var tmp;
			if(curpat.type==='compressed') {
				var m;
				if(m = curpat.symbol.exec(str.slice(pos.x))) {
					pos.x += m.index + m[0].length;
					tmp = true;
				}
				else
					tmp = err_rgxx(pos.x,curpat.symbol.source.slice(1),curpat.pos);
			}
			else if(curpat.type==='symbol') {
				if(curpat.symbol instanceof RegExp){
					var m;
					if(m = curpat.symbol.exec(str.slice(pos.x))) {
						tmp = true;
						pos.x += m.index + m[0].length;
					}
					else {
						tmp = err_rgxx(pos.x,curpat.symbol.source.slice(1),curpat.pos);
					}
				}
				else{
					var text = curpat.symbol;
					if (str.substr(pos.x, text.length) == text)	{
						tmp = true;
						pos.x += text.length;
					}
					else{
						tmp = err_txt(pos.x,text);
					}
				}
			}
			else if(curpat.type==='pattern') {
				// #todo надо как-то curpat.pos и curpat.end использовать
				/* если FatalError - возвращаем FatalError+обработка ошибок
					+ если задано name - обернуть в новый FatalError и завершить
				*/
				if(curpat.ret_pattern.mode==='cat') {
					var back_res = {res:{}};  // игнорируем
					var err = curpat.ret_pattern.fun(str,pos,back_res); // ВЫЗВАЛИ!
				}
				else {
					var err = curpat.ret_pattern.fun(str,pos,inres); // ВЫЗВАЛИ!
				}
				tmp = isGood(err) ? true : err;
			}
			else if(compressed_patterns[i].type==='link') {	// #todo поиск функции, а потом вызов как при pattern
			}
			else throw new Error('неизвестный тип паттерна');

			if(isGood(tmp)) {
			}
			else if(notFatal(tmp)) parse_errs.push(tmp);
			else { // isFatal
				if(parse_errs.length>0){
					parse_errs.push(tmp);
					tmp = err_in_f(X,name?name:'unnamed group',parse_errs);
				}
				tmp = handle(tmp,undefined,X,self,handlers, error_handlers);
				return before_return(tmp);
			}
		}

		if(parse_errs.length>0){
			var tmp = err_in_p(X,name?name:'unnamed group',parse_errs);
			tmp = handle(tmp,undefined,X,self,handlers, error_handlers);
			return before_return(tmp);
		}
		else{
			if(name===null && handlers.length>0) throw new Error('объектная последовательность без имени имеет обработчик результата');
			var tmp = handle(true,inres.res,X,self,handlers, error_handlers);
			try {
				set_res_obj(res,tmp,name);
			}
			catch(e){
				return err_not_obj(X,pattern_x,e)
			}
			return before_return(true);
		}
		set_res_obj(res,modify_result(modifiers,inres.res,X,pos.x),name)
		return true;
	}
}

Parser.prototype.alternatives_compile = function alternatives_compile([head,tail]){
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
}

//}

//{ ==== тесты ядра ====
/* конкатенирующие и отрицание - тесты
	последовательности
		ab[1-9]*cd
			abcd
			ab12334cd
		ab([1-9]*c)d
			abcd
			ab12334cd
	циклы
		a(x)*b
			ab
			axb
			axxxxb
		a(x)+b
			ab
			axb
			axxxxb
		a(x)?b
			ab
			axb
			axxb
		a(x){7,9}b
			ab
			axb
			axxxxxxxxb
			axxxxxxxxxxb
	альтернативы
		a|b|c
			a
			b
			c
			d
		в последовательностях
			x(a|b|c)y
				xy
				xay
				xby
				xcy
				xdy
		в циклах
			x(a|b|c)*y
				xy
				xaby
				xbcy
				xcdy
				xdy
		группы (энергичные, без возвратов, как будто (?>...))
			a(bc|b|x)cc 
				abcc fail
				axcc OK
	отрицание
		?!x
			x	fail
		ab(?!x)cd
			abcd	OK
			abxcd	fail
			abycd	fail
		a|?!x|b
			a	OK(1)
			x	fail(2)
			b	OK(3)
		a|?!x|x
			x	fail(2)
		a|x|?!x
			x	OK(2)
		k(a|?!x|b)l
			kxl	fail
		k|(a|?!x|b)|x
			x	OK
		k|(?!x)|x
			x	OK
		k|(?!y)|z
			x	fail(2), остались непрочитанные символы - todo
*/
test.add_test('/','cat_negate',(path)=>{
	var alt = parse('reg_alternatives')
	var err_alt = err_parse('reg_alternatives')
	describe('конкатенирующие и отрицание',()=>{
		describe('последовательности',()=>{
/*	последовательности
		ab[1-9]*cd
			abcd
			ab12334cd
		ab([1-9]*c)d
			abcd
			ab12334cd
*/
			it_parse('ab[1-9]*cd','abcd','abcd',alt)
			it_parse('ab[1-9]*cd','ab12334cd','ab12334cd',alt)
			it_parse('ab([1-9]*c)d','abcd','abcd',alt)
			it_parse('ab([1-9]*c)d','ab12334cd','ab12334cd',alt)
		})
		describe('циклы',()=>{
/*	циклы
		a(x)*b
			ab
			axb
			axxxxb
		a(x)+b
			ab
			axb
			axxxxb
		a(x)?b
			ab
			axb
			axxb
		a(x){7,9}b
			ab
			axb
			axxxxxxxxb
			axxxxxxxxxxb
*/
			it_parse('a(x)*b','ab','ab',alt)
			it_parse('a(x)*b','axb','axb',alt)
			it_parse('a(x)*b','axxxxb','axxxxb',alt)
			it_err_parse('a(x)+b','ab',()=>err_rgxx(1,/x/.source,2),err_alt)
			it_parse('a(x)+b','axb','axb',alt)
			it_parse('a(x)+b','axxxxb','axxxxb',alt)
			it_parse('a(x)?b','ab','ab',alt)
			it_parse('a(x)?b','axb','axb',alt)
			it_err_parse('a(x)?b','axxxxb',()=>err_rgxx(2,/b/.source,5),err_alt)
			it_err_parse('a(x){7,9}b','ab',()=>err_rgxx(1,/x/.source,2),err_alt)
			it_err_parse('a(x){7,9}b','axb',()=>err_rgxx(2,/x/.source,2),err_alt)
			it_parse('a(x){7,9}b','axxxxxxxxb','axxxxxxxxb',alt)
			it_err_parse('a(x){7,9}b','axxxxxxxxxxb',()=>err_rgxx(10,/b/.source,9),err_alt)
		})
		describe('альтернативы',()=>{
/*
	альтернативы
		a|b|c
			a
			b
			c
			d
		в последовательностях
			x(a|b|c)y
				xy
				xay
				xby
				xcy
				xdy
		в циклах
			x(a|b|c)*y
				xy
				xaby
				xbcy
				xcdy
				xdy
		группы пока только энергичные, без возвратов, как будто (?>...)
			a(bc|b|x)cc 
				abcc fail
				axcc OK
*/
			it_parse('a|b|c','a','a',alt)
			it_parse('a|b|c','b','b',alt)
			it_parse('a|b|c','c','c',alt)
			it_err_parse('a|b|c','d',()=>err_any(0,[
				err_rgxx(0,/a/.source,0),
				err_rgxx(0,/b/.source,2),
				err_rgxx(0,/c/.source,4),
				]),err_alt)
			describe('в последовательностях',()=>{
				it_err_parse('x(a|b|c)y','xy',()=>err_any(1,[
					err_rgxx(1,/a/.source,2),
					err_rgxx(1,/b/.source,4),
					err_rgxx(1,/c/.source,6),
					]),err_alt)
				it_parse('x(a|b|c)y','xay','xay',alt)
				it_parse('x(a|b|c)y','xby','xby',alt)
				it_parse('x(a|b|c)y','xcy','xcy',alt)
				it_err_parse('x(a|b|c)y','xdy',()=>err_any(1,[
					err_rgxx(1,/a/.source,2),
					err_rgxx(1,/b/.source,4),
					err_rgxx(1,/c/.source,6),
					]),err_alt)
			})
			describe('в циклах',()=>{
				it_parse('x(a|b|c)*y','xy','xy',alt)
				it_parse('x(a|b|c)*y','xaby','xaby',alt)
				it_parse('x(a|b|c)*y','xbcy','xbcy',alt)
				it_err_parse('x(a|b|c)*y','xcdy',()=>err_rgxx(2,/y/.source,9),err_alt)
				it_err_parse('x(a|b|c)*y','xdy',()=>err_rgxx(1,/y/.source,9),err_alt)
			})
			describe('группы пока только энергичные, без возвратов, как будто (?>...)',()=>{
				it_err_parse('a(bc|b|x)cc','abcc',()=>err_rgxx(3,/cc/.source,9),err_alt)
				it_parse('a(bc|b|x)cc','axcc','axcc',alt)
			})
		})
		describe('отрицание',()=>{
/*
	отрицание
		?!x
			x	fail
		ab(?!x)cd
			abcd	OK
			abxcd	fail
			abycd	fail
		a|?!x|b
			a	OK(1)
			x	fail(2)
			b	OK(3)
		a|?!x|x
			x	fail(2)
		a|x|?!x
			x	OK(2)
		k(a|?!x|b)l
			kxl	fail
		k|(a|?!x|b)|x
			x	OK
		k|(?!x)|x
			x	OK
		k|(?!y)|z
			x	fail(2), остались непрочитанные символы
*/
			it_err_parse('?!x','x',()=>err_fail_not(0,'безымянная последовательность'),err_alt)
			it_parse('ab(?!x)cd','abcd','abcd',alt)
			it_err_parse('ab(?!x)cd','abxcd',()=>err_fail_not(2,'безымянная последовательность'),err_alt)
			it_err_parse('ab(?!x)cd','abycd',()=>err_rgxx(2,/cd/.source,7),err_alt)
			it_parse('a|?!x|b','a','a',alt)
			it_err_parse('a|?!x|b','x',()=>err_any(0,[
				err_rgxx(0,/a/.source,0),
				err_fail_not(0,'безымянная последовательность')
				]),err_alt)
			it_parse('a|?!x|b','b','b',alt)
			it_err_parse('a|?!x|x','x',()=>err_any(0,[
				err_rgxx(0,/a/.source,0),
				err_fail_not(0,'безымянная последовательность')
				]),err_alt)
			it_parse('a|x|?!x','x','x',alt)
			it_err_parse('k(a|?!x|b)l','kxl',()=>err_any(1,[
				err_rgxx(1,/a/.source,2),
				err_fail_not(1,'безымянная последовательность')
				]),err_alt)
			it_parse('k|(a|?!x|b)|x','x','x',alt)
			it_parse('k|(?!x)|x','x','x',alt)
/*			it_err_parse('k|(?!y)|z','x',()=>err_any(1,[
				err_rgxx(1,/a/.source,0),
				err_fail_not(1,'безымянная последовательность')
				]),err_alt)
				не err_alt надо, а что-то, что проверяет оставшиеся символы
*/
		})
	})
})
/* объектные и toString - тесты
	последовательности, создание объекта 
		глубиной 1
			напрямую
				?name=xy
			через неименованную вложенность
				ab(?name=xy)cd
			toString
				q(?toString:ab(?name=xy)cd)w
		глубиной 3
			?n1=(q(?n2=w)e)(?n3=(?n4=r)t(?n5=y))u(?n6=iop)
				qwertyuiop	{n1:{n2:'w',n3:{n4:'r',n5:'y'},n6:'iop'}}
		когда в объектной последовательности не указано имя, 
			то результатом этой последовательности будет именно объект,
			и такая последовательность скопирует все свойства этого объекта в предоставленный родительской функцией объект (и по этому обработчики запрещены, т.к. они могут возвратить и не объект)
			?n1=(?`7`<q(?n2=w)e)(?n3=(?n4=r)t(?n5=y))u(?n6=iop) ошибка
	циклы
		ab(?n=*x|y|z)*cd
			abxyxyxzcd	{n:['x','y','x','y','x','z']}
		ab(?=*x|y|z)*cd
			abxyxyxzcd	['x','y','x','y','x','z']
		ab(*x(?=y)z)*cd	ошибка
		ab(?toString:*x(?=y)z)*cd
			abxyzxyzcd	ab['y','y']cd
	direct с пустым именем
		напрямую
			для возможности добавления обработчиков рядом с ?=
				?n1=(?=?`{erg.n7='asd';return arg}`<q(?n2=w)e(?n4=r)t(?n5=y))u(?n6=iop)
					qwertyuiop	{n1:{n2:'w',n4:'r',n5:'y',n7:'asd',n6:'iop'}}
				?n1=(q(?n2=w)e)(?=(?n4=r)t(?n5=y))u(?n6=iop)
					qwertyuiop	{n1:{n4:'r',n5:'y',n6:'iop'}}  
					 - здесь промежуточный результат {n2:'w'} полностью заменяется объектом {n4:'r',n5:'y'}, после чего в этот объект добавляется n6:'iop'
				?n1=(?=?`arg.n4+arg.n5`<(?n4=r)t(?n5=y))u(?n6=iop)
					qwertyuiop	{n1:'ry'}}
					 - первая внешняя скобка родительский объект заменяет строкой, а вторая внешняя скобка добавляет свойство к этой строке (это происходит без ошибок, но при этом с этой переменной ни каких изменений не происходит)
			для первоначального создания свойства где-то выше, особенно внутри циклов
				q(?n1=(?=w(?=e)r|?=tyu))i - здесь можно обойтись без ?=
					qweri	{n1:'e'}
					qtyui	{n1:'tyu'}
				q(w(?n1=e)r|?n1=tyu)i
					qweri	{n1:'e'}
					qtyui	{n1:'tyu'}
				?=x(?=a(?=sd)f|q(?=we)r)*y
					xasdfasdfqwery	['sd','sd','we']
			для обрубания результата всего паттерна
				?=q(?=*w)*e
					qwwwwe	['w','w','w','w']
				?=q(?=(w)*)e
					qwwwwe	wwww
		непрерывность (ошибка компиляции)
			?= означает, что промежуточный результат родительской функции нужно заменить полученным результатом (и он может быть не обязательно объектом)
				q(?n1=(w(?=e)r|?=tyu))i ошибка
			ну и еще для удобочитаемости
				qw((?n1=er)(?n2=ty))*ui	ошибка
				?=qw(?=*(?n1=er)(?n2=ty))*ui
					qwertyertyui	[{n1:'er',n2:'ty'},{n1:'er',n2:'ty'}]
*/
test.add_test('/','obj_toString',(path)=>{
	var alt = parse('reg_alternatives')
	var err_alt = err_parse('reg_alternatives')
	var comp_alt = compile('reg_alternatives')
	describe('объектные и toString',()=>{
		describe('последовательности, создание объекта',()=>{
/*
	последовательности, создание объекта 
			глубиной 1
				напрямую
					?name=xy
				через неименованную вложенность
					ab(?name=xy)cd
				toString
					q(?toString:ab(?name=xy)cd)w
			глубиной 3
				?n1=(q(?n2=w)e)(?n3=(?n4=r)t(?n5=y))u(?n6=iop)
					qwertyuiop	{n1:{n2:'w',n3:{n4:'r',n5:'y'},n6:'iop'}}
			когда в объектной последовательности не указано имя, 
				то результатом этой последовательности будет именно объект,
				и такая последовательность скопирует все свойства этого объекта в предоставленный родительской функцией объект (и по этому обработчики запрещены, т.к. они могут возвратить и не объект)
				?n1=(?`7`<q(?n2=w)e)(?n3=(?n4=r)t(?n5=y))u(?n6=iop) ошибка
*/
			describe('глубиной 1',()=>{
				it_parse('?name=xy','xy',{name:'xy'},alt,"напрямую: ");
				it_parse('ab(?name=xy)cd','abxycd',{name:'xy'},alt,"через неименованную вложенность: ");
				it_parse('q(?toString:ab(?name=xy)cd)w','qabxycdw',
					'q{"name":"xy"}w',alt,"напрямую: ");
			})
			describe('глубиной 3',()=>{
				it_parse('?n1=(q(?n2=w)e)(?n3=(?n4=r)t(?n5=y))u(?n6=iop)','qwertyuiop',
					{n1:{n2:'w',n3:{n4:'r',n5:'y'},n6:'iop'}},alt);
			})
			describe('когда в объектной последовательности не указано имя, то результатом этой \
последовательности будет именно объект, и такая последовательность скопирует все свойства этого\
 объекта в предоставленный родительской функцией объект (и по этому обработчики запрещены, т.к.\
 они могут возвратить и не объект)',()=>{
				it_err_compile('a(q(?n2=w)e/*7*/)s',
					()=>err_in(0,'reg_sequence',perr_obj_handlers(16)),comp_alt)
			})
		})
		describe('циклы',()=>{
/*
	циклы
		ab(?n=*x|y|z)*cd
			abxyxyxzcd	{n:['x','y','x','y','x','z']}
		?=ab(?=*x|y|z)*cd
			abxyxyxzcd	['x','y','x','y','x','z']
		ab(*x(?=y)z)*cd	ошибка
		ab(?toString:*x(?=y)z)*cd
			abxyzxyzcd	ab['y','y']cd
*/
			it_parse('ab(?n=//x|y|z)*cd','abxyxyxzcd',{n:'xyxyxz'},alt);
			it_parse('ab(?n=//?=(x|y|z))*cd','abxyxyxzcd',{n:['x','y','x','y','x','z']},alt);
			it_parse('?=ab(?=//x|y|z)*cd','abxyxyxzcd','xyxyxz',alt);
			it_parse('?=ab(?=//?=(x|y|z))*cd','abxyxyxzcd',['x','y','x','y','x','z'],alt);
			it_err_compile('ab(//x(?=y)z)*cd',
				()=>perr_cycle_name(2),comp_alt)
			it_parse('ab(?toString://?=x(?=y)z)*cd','abxyzxyzcd','ab["y","y"]cd',alt);
		})
		describe('direct с пустым именем',()=>{
			describe('напрямую',()=>{
/*
		напрямую
			для возможности добавления обработчиков рядом с ?=
				?n1=(?=?`{erg.n7='asd';return arg}`<q(?n2=w)e(?n4=r)t(?n5=y))u(?n6=iop)
					qwertyuiop	{n1:{n2:'w',n4:'r',n5:'y',n7:'asd',n6:'iop'}}
				?n1=(q(?n2=w)e)(?=(?n4=r)t(?n5=y))u(?n6=iop)
					qwertyuiop	{n1:{n4:'r',n5:'y',n6:'iop'}}  
					 - здесь промежуточный результат {n2:'w'} полностью заменяется объектом {n4:'r',n5:'y'}, после чего в этот объект добавляется n6:'iop'
				?n1=(?=?`arg.n4+arg.n5`<(?n4=r)t(?n5=y))u(?n6=iop)
					qwertyuiop	{n1:'ry'}}
					 - первая внешняя скобка родительский объект заменяет строкой, а вторая внешняя скобка добавляет свойство к этой строке (это происходит без ошибок, но при этом с этой переменной ни каких изменений не происходит)
			для первоначального создания свойства где-то выше, особенно внутри циклов
				q(?n1=(?=w(?=e)r|?=tyu))i - здесь можно обойтись без ?=
					qweri	{n1:'e'}
					qtyui	{n1:'tyu'}
				q(w(?n1=e)r|?n1=tyu)i
					qweri	{n1:'e'}
					qtyui	{n1:'tyu'}
				?=x(?=a(?=sd)f|q(?=we)r)*y
					xasdfasdfqwery	['sd','sd','we']
			для обрубания результата всего паттерна
				?=q(?=*w)*e
					qwwwwe	['w','w','w','w']
				?=q(?=(w)*)e
					qwwwwe	wwww
*/
				describe('для возможности добавления обработчиков рядом с ?=',()=>{
				it_parse('?n1=(?=q(?n2=w)e(?n4=r)t(?n5=y)/*{arg.n7="asd";return arg}*/)u(?n6=iop)',
						'qwertyuiop',{n1:{n2:'w',n4:'r',n5:'y',n7:'asd',n6:'iop'}},alt);
					it_parse('?n1=(q(?n2=w)e)(?=(?n4=r)t(?n5=y))u(?n6=iop)','qwertyuiop',
						{n1:{n4:'r',n5:'y',n6:'iop'}},alt,
						'- здесь промежуточный результат {n2:"w"} полностью заменяется объектом\
 {n4:"r",n5:"y"}, после чего в этот объект добавляется n6:"iop":--- ');
					it_err_parse('?n1=(?=(?n4=r)t(?n5=y)/*arg.n4+arg.n5*/)u(?n6=iop)','rtyuiop',
						()=>err_in(0,'n1',err_not_obj(4,49,new Error('Cannot set property n6 of undefined'))),err_alt,
						'первая внешняя скобка родительский объект заменяет строкой, а вторая внешняя скобка пытается добавить свойство к этой строке :--- ');
				})
				describe('для первоначального создания свойства где-то выше, особенно внутри циклов',()=>{
					it_parse('q(?n1=(?=w(?=e)r|?=tyu))i','qweri',{n1:'e'},alt,
						'здесь можно обойтись без ?=:-- ')
					it_parse('q(?n1=(?=w(?=e)r|?=tyu))i','qtyui',{n1:'tyu'},alt,
						'здесь можно обойтись без ?=:-- ')
					it_parse('q(w(?n1=e)r|?n1=tyu)i','qweri',{n1:'e'},alt)
					it_parse('q(w(?n1=e)r|?n1=tyu)i','qtyui',{n1:'tyu'},alt)
					it_parse('?=x(?=//?=a(?=sd)f|?=q(?=we)r)*y','xasdfasdfqwery',['sd','sd','we'],alt)
					it_err_compile('?=x(?=a(?=sd)f|q(?=we)r)*y',
						()=>perr_cycle_name(3),comp_alt)
				})
				describe('для обрубания результата всего паттерна',()=>{
					it_parse('?=q(?=//w)*e','qwwwwe','wwww',alt)
					it_parse('?=q(?=//?=w)*e','qwwwwe',['w','w','w','w'],alt)
					it_parse('?=q(?=(w)*)e','qwwwwe','wwww',alt)
				})
			})
			
		})
		describe('непрерывность (ошибка компиляции)',()=>{
/*
		непрерывность (ошибка компиляции)
			?= означает, что промежуточный результат родительской функции нужно заменить полученным результатом (и он может быть не обязательно объектом)
				q(?n1=(w(?=e)r|?=tyu))i ошибка
			ну и еще для удобочитаемости
				qw((?n1=er)(?n2=ty))*ui	ошибка
				?=qw(?=*(?n1=er)(?n2=ty))*ui
					qwertyertyui	[{n1:'er',n2:'ty'},{n1:'er',n2:'ty'}]
*/
			describe('?= означает, что промежуточный результат родительской функции нужно заменить полученным результатом (и он может быть не обязательно объектом)',()=>{
				it_err_compile('?=x(?=a(?=sd)f|q(?=we)r)*y',
					()=>perr_cycle_name(3),comp_alt)
			})
			describe('ну и еще для удобочитаемости',()=>{
				it_err_compile('qw((?n1=er)(?n2=ty))*ui',
					()=>perr_cycle_name(2),comp_alt)
				it_parse('?=qw(?=//(?n1=er)(?n2=ty))*ui','qwertyertyui',
					[{n1:'er',n2:'ty'},{n1:'er',n2:'ty'}],alt)
			})
		})
	})
})

//}

//{ === начало ===
function Parser(arg) {
	this.reg_sequence      = new Pattern(this.read_reg_sequence     .bind(this));
	this.reg_alternatives  = new Pattern(this.read_reg_alternatives .bind(this));
	this.bnf_sequence_     = new Pattern(this.read_bnf_sequence_    .bind(this));
	this.bnf_alternatives_ = new Pattern(this.read_bnf_alternatives_.bind(this));
	this.expr              = new Pattern(this.read_expr             .bind(this));
	this.create            = new Pattern(this.read_main             .bind(this));

	this.tail_error = [];
	this.handler_global_object = {ParseError,FatalError};
	
	this.patterns = {};
	this.main = 'main';
	
	if(arg!==undefined) this.create(arg);
	return this;
}
exports.Parser = Parser;

// expr ::= identifier spcs (`:=`reg_alternatives | `::=` spcs bnf_alternatives_ );
// добавляет паттерн, проверяет, чтобы не было повторяющихся имен
Parser.prototype.read_expr = function read_expr(str,pos) {
	var data = seq({
		name:identifier.then((r,x)=>({name:r,pos:x})),
		none:spcs,
		pattern:any(
			seq(need(1),txt( ':='),this.reg_alternatives),
			seq(need(1),txt('::='),this.bnf_alternatives)
		)
	}).exec(str.pos);
	if(!isGood(data)) return data;
	if(data.name.name in this.patterns)
		return new ParseError(data.name.pos,"Такой паттерн уже объявлен: "+data.name.name);
	this.patterns[data.name.name] = {pos:data.name.pos,pattern:data.pattern};
	return true;
}

// main ::= spcs (handler spcs)* expr(`;` spcs expr)* (`;` spcs)? ;
Parser.prototype.read_main = function read_main(str,pos) {
	var data = seq({
		none1:spcs,
		begin_handlers:rep(seq(need(0),handler.then(pos_adder),spcs)),
		head:expr,
		tail:rep(seq(need(2),txt(';'),spcs,expr)),
		none2:opt(seq(need_none,txt(';'),spcs))
	}).exec(str,pos);
	if(!isGood(data)) return data;
	this.begin_handlers = data.begin_handlers;
	data = this.check_links(this.main);
	if(!isGood(data)) return data;
	return true;
}

Parser.prototype.check_links = function check_links(additional){
	if(additional===undefined) additional = [];
	if(! (additional instanceof Array)) additional = [additional];
	//...
	return true;
}
//}

} //function main(module, exports, require)
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
