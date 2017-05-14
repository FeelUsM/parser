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
убрать все в сторону и добавлять по чуть чуть

перепроверить и подключить компиляцию
перепроверить и подключить тесты

разобраться с политикой предоставления ошибок в parser-е
чтобы direct obj последовательность проверяла, что все obj последовательности, которые она вызывает - тоже direct
получать на вход обработчика ошибки как дочерние ошибки, так и удачные результаты(?)
 - ParseError - возвращается функцией и возвращается как результат.

задать расположение фишки link & back_pattern, и немного позаполнять
	ловля ошибок выполнения

сделать expr, main и web-интерфейс
переделать и везде вставить комментарии (|...|) || ...\n
добавить игнорирование строк и комментариев в обработчиках
npm, статья

(?`...`?(...):(....))
toLowercase
*/

// === синтаксис ===
/*(?#=== обычные токены ===)
spc :=[\ \r\n\t\v\f];
spcs:=$spc*;
num :=[0-9]+;
identifier :=[a-zA-Z_][a-zA-Z_0-9]*;
*/
/*(?#=== токены символов ===)
quotedSequence ::=\` ( [^\`\\] | \\\` | \\\\)* \` ;
reg_char :=[^\\\/\``;|$.*+?()[]{}`]|\\.;
	(?#здесь перечислены управляющие символы, остальные символы считаются обычными)
bnf_char :=\\.;
	(?#любые символы считаются управляющими, обычные символы надо брать в кавычки или экранировать)
	
reg_classChar ::= [^\\\/\``^-;|$.*+?()[]{}`] | `\\`.
	(?#к управляющим символам добавляется `^-`, пробелы разрешены);
bnf_classChar ::= [^\\\/\``^-;|$.*+?()[]{} `]| `\\`.
	(?#к управляющим символам добавляется `^-`, пробелы запрещены);
	
reg_class ::= `.` | `[``^`?      (reg_classChar(`-`reg_classChar)?      |quotedSequence     )*`]` 
	/ *=>new RegExp(arg)* /;
bnf_class ::= `.` | `[``^`? spcs (bnf_classChar(`-`bnf_classChar)? spcs |quotedSequence spcs)*`]` 
	/ *=>new RegExp(arg)* /;

reg_link ::= `$`  ( ?id=identifier | `{` (?id=identifier) `}` ) /*=>{link:arg.id}* /;
bnf_link ::= `$`? ( ?id=identifier | `{` (?id=identifier) `}` ) /*=>{link:arg.id}* /;

reg_symbol ::= reg_char|quotedSequence|reg_class|reg_link;
bnf_symbol ::= bnf_char|quotedSequence|bnf_class|bnf_link;
*/
//(?#fake_... - синтаксис такой же как у настоящего, только не происходит обработка)
/*(?#=== другие токены: квантификаторы, модификаторы, обработчики и комментарии ===)
quantifier ::= [`*+?`] | `{` spc* (`,` spc* num | num (spc* `,` spc* num?)? ) spc* `}` ;
	(?# возвращет объект {min:int,max:int} )
	
modifier ::= `?`
	(	`!` (?#отрицание)
	|	identifier  `->` (?#back_pattern - то, что будет прочитано, превратиться в константу, и потом этот identifier можно будет вызывать как нетерминал)
	|	identifier? `=`  (?#имя последовательности - имя результата)
	|	`toString:`      (?#директива, преобразующая объектную последовательность в строковую)
	);
	(?# возвращет объект {type:string[,data:id]} )
	
fake_handler ::= (`/*`|`/error*`)(?!`*``/`|.)*`*``/` (?#в `*``/` - `` не убран по тому, что иначе это будет воспринято концом комментария в js)
handler ::= (`/*`|`/error*`)(?!`*``/`|.)*`*``/`
	(?#`/*код*``//*=>выр-е*``//*?выр-е по умолчанию*``//error*код*``//error*=>выр-е*``//error*?выр-е по умолчанию*``/`)
	(?# возвращет объект {error:bool,code:Function} )
	
fake_reg_sequence ::=
	modifier*
	(( reg_symbol | comment | `(` (modifier* `*`)? fake_reg_alternatives `)`)
		quantifier? fake_handler*)*
	`*`? fake_handler*;
fake_reg_alternatives ::= fake_reg_sequence (`|` fake_reg_sequence)*;

comment ::= `(?#` (modifier* `*`)? fake_reg_alternatives `)`
*/
/*(?#=== ядро ===)
reg_sequence ::=
	modifier* handler*
	(( reg_symbol | comment | `(` (modifier+ `*`)? reg_alternatives `)`)
		quantifier? handler*)*
	`*`? handler*;
reg_alternatives ::= reg_sequence (`|` reg_sequence)*;

bnf_sequence_ ::=
	(modifier spcs)* (handler spcs)*
	(( bnf_symbol | comment | `(` spcs ((modifier spcs)+ `*` spcs)? bnf_alternatives_ `)`) spcs
		(quantifier spcs)? (handler spcs)*)*
	(`*` spcs)? (handler spcs)*;
bnf_alternatives_ ::= bnf_sequence_ (`|` spcs bnf_sequence_)*;
(?# подчеркивание в конце означает, что этот паттерн сам съедает в конце пробелы,
т.е. после него не обязательно добавлять spcs)
*/
/*(?#=== начало ===)
expr ::= identifier spcs (`:=`reg_alternatives | `::=` spcs bnf_alternatives_ );
main ::= ((handler|comment)* spcs)* expr(`;` (comment spcs)* expr)* `;`? ;
*/

Error.prototype.toJSON = function(){ return {name:this.name,message:this.message} }

var merger = (arr)=>{
	var r = arr.join('');
	//console.log('merge: '+r);
	return r;
}
var err_in = (x, what, why)=>new FatalError(x,'in '+what,why)

// возвращает регексп (без галки вначале)
var escaper = (s)=>{
	var r = s.replace(/([\^\-\ \\\/\|\$\.\*\+\?\(\)\[\]\{\}])/g,'\\$1');
	//console.log('replace: '+r);
	return r;
}

//{ ==== обычные токены ====

// spc :=[\ \r\n\t\v\f];
var err_spc = (x)=>new FatalError(x,'ожидался пробельный символ');
exports.err_spc = err_spc;
var spc = rgx(/^[\ \r\n\t\v\f]/).then(0,err_spc);

// spcs:=$spc*;
var spcs = rep(spc,star).then(r=>'');

// num :=[0-9]+;
var err_num = (x)=>new FatalError(x,'ожидалось число');
exports.err_num = err_num;
var num = rgx(/^[0-9]+/).then(m=>+m[0],err_num);

// identifier :=[a-zA-Z_][a-zA-Z_0-9]*;
var err_id = (x)=>new FatalError(x,'ожидался идентификатор');
exports.err_id = err_id;
var identifier = rgx(/^[a-zA-Z_][a-zA-Z_0-9]*/).then(m=>m[0],err_id)

//}

//{ ==== токены символов ====

test.add_category('/','symbolTokens','');

// quotedSequence ::= \` ( [^\`\\] | \\\` | \\\\)* \` ;
// возвращает строку, в которой убрано экранирование
var err_qseq = (x)=>new FatalError(x,'ожидалась строка в обратных кавычках');
exports.err_qseq = err_qseq;
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
			' (?#возвращает строку)',()=>{
		it_compile(	/`qwer`/.source		,'qwer'			,compile(quotedSequence))
		it_compile(	/`qw\\er`/.source	,'qw\\er'		,compile(quotedSequence))
		it_compile(	/`qw\`er`/.source	,'qw`er'		,compile(quotedSequence))
		it_compile(	/`qw\\\`er`/.source	,'qw\\`er'		,compile(quotedSequence))
		it_err_compile(	""				,()=>err_qseq(0),compile(quotedSequence))
	})
})

// reg_char :=[^\\\/\``;|$.*+?()[]{}`]|\\.;
//(?#здесь перечислены управляющие символы, остальные символы считаются обычными)
// возвращает символ
var err_char = (x)=>new FatalError(x,'ожидался символ');
exports.err_char = err_char;
var reg_char = rgx(/^[^\\\/`;\|\$\.\*\+\?\(\)\[\]\{\}]|\\./).then(
	m=>m[0].replace(/\\(.)/,'$1'),
	err_char
);
test.add_test('/symbolTokens','reg_char',(path)=>{
	describe('reg_char ::='+/[^\\\/\``;|$.*+?()[]{}`] | \\./.source+' (?#возвращает символ) (?#здесь перечислены управляющие символы, остальные символы считаются обычными)',()=>{
		it_compile(		'1'		,'1'			,compile(reg_char))
		it_err_compile(	'$'		,()=>err_char(0),compile(reg_char))
		it_compile(		'\\$'	,'$'			,compile(reg_char))
		it_err_compile(	""		,()=>err_char(0),compile(reg_char))
	})
})

// bnf_char :=\\.;
//(?#любые символы считаются управляющими, обычные символы надо брать в кавычки или  экранировать)
var bnf_char = rgx(/^\\(.)/).then(
	m=>m[1],
	err_char
);
test.add_test('/symbolTokens','bnf_char',(path)=>{
	describe('bnf_char ::= '+/\\./.source+' (?#возвращает символ) \
(?#любые символы считаются управляющими, обычные символы надо брать в кавычки или экранировать)',
	()=>{
		it_compile    ('\\1','1'            ,compile(bnf_char))
		it_err_compile('1'	,()=>err_char(0),compile(bnf_char))
		it_err_compile('$'	,()=>err_char(0),compile(bnf_char))
		it_err_compile(''	,()=>err_char(0),compile(bnf_char))
	})
})

// reg_classChar ::= [^\\\/\``^-;|$.*+?()[]{}`] | `\\`.
//(?#к управляющим символам добавляется `^-`, пробелы разрешены);
// возвращает символ
var err_classChar = (x)=>new FatalError(x,'ожидался символ класса символов');
exports.err_classChar = err_classChar;
var reg_classChar = rgx(/^[^\^\-\\\/`;\|\$\.\*\+\?\(\)\[\]\{\}]|\\./).then(
	m=>m[0].replace(/\\(.)/,'$1'),
	err_classChar
);
test.add_test('/symbolTokens','reg_classChar',(path)=>{
	describe('reg_classChar ::= ['+/^\\\/\`/.source+'`^-;|$.*+?()[]{}`] | '+/\\./.source+
	' (?#возвращает символ) (?#к управляющим символам добавляется `^-`, пробелы разрешены)',()=>{
		it_compile(		'1'		,'1'					,compile(reg_classChar))
		it_compile(		' '		,' '					,compile(reg_classChar))
		it_err_compile(	'^'		,()=>err_classChar(0)	,compile(reg_classChar))
		it_err_compile(	'-'		,()=>err_classChar(0)	,compile(reg_classChar))
		it_compile(		'\\^'	,'^'					,compile(reg_classChar))
		it_compile(		'\\-'	,'-'					,compile(reg_classChar))
		it_err_compile(	''		,()=>err_classChar(0)	,compile(reg_classChar))
	})
})

// bnf_classChar ::= [^\\\/\``^-;|$.*+?()[]{} `]| `\\`.
//(?#к управляющим символам добавляется `^-`, пробелы запрещены) ;
var bnf_classChar = rgx(/^[^\^\-\\\/`;\|\$\.\*\+\?\(\)\[\]\{\}\ ]|\\./).then(
	m=>m[0].replace(/\\(.)/,'$1'),
	err_classChar
);
test.add_test('/symbolTokens','bnf_classChar',(path)=>{
	describe('bnf_classChar ::= ['+/^\\\/\`/.source+'`^-;|$.*+?()[]{} `] | '+/\\./.source+
	' (?#возвращает символ) (?#к управляющим символам добавляется `^-`, пробелы запрещены)',()=>{
		it_compile(		'1'     ,'1'                    ,compile(bnf_classChar))
		it_err_compile(	' '		,()=>err_classChar(0)	,compile(bnf_classChar))
		it_err_compile(	'^'		,()=>err_classChar(0)	,compile(bnf_classChar))
		it_err_compile(	'-'		,()=>err_classChar(0)	,compile(bnf_classChar))
		it_compile(		'\\^'	,'^'					,compile(bnf_classChar))
		it_compile(		'\\-'	,'-'					,compile(bnf_classChar))
		it_err_compile(	''		,()=>err_classChar(0)	,compile(bnf_classChar))
	})
})

//	reg_class ::= 
// `.` | `[``^`? ($reg_classChar(`-`$reg_classChar)? |$quotedSequence )*`]` /*=>new RegExp(arg)*/;
var err_inClass = messageAdder('класс символов');
exports.err_inClass = err_inClass;
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
reg_class.exec('[');
test.add_test('/symbolTokens','reg_class',(path)=>{
	describe('reg_class ::= `.`|`[``^`? ($reg_classChar(`-`$reg_classChar)? |$quotedSequence )*`]`'
	+' (?#возвращает регексп (без галки вначале))',()=>{
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

// bnf_class ::= 
// `.` | `[``^`? $spcs ($bnf_classChar(`-`$bnf_classChar)? $spcs |$quotedSequence $spcs)*`]`  /*=>new RegExp(arg)*/;
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
	describe('bnf_class ::= `.` | `[``^`? $spcs ($bnf_classChar(`-`$bnf_classChar)? $spcs \
|$quotedSequence $spcs)*`]` (?#возвращает регексп (без галки вначале))',()=>{
		it_compile('[ \\a \\b \\c ]',/[abc]/,compile(bnf_class))
	});
})

// reg_link ::= `$`  ( ?id=identifier | `{` (?id=identifier) `}` ) /*=>{link:arg.id}* /;
// возвращает ссылку на паттерн
var err_link = (x)=>new FatalError(x,'ожидалась ссылка');
exports.err_link = err_link;
var reg_link = seq(need(1),txt('$'),
	any(identifier,
		seq(need(1),txt('{'),identifier,txt('}')))
).then(id=>({link:id}),err_link);

// bnf_link ::= `$`? ( ?id=identifier | `{` (?id=identifier) `}` ) /*=>{link:arg.id}* /;
var bnf_link = seq(need(1),opt(txt('$')),
	any(identifier,
		seq(need(1),txt('{'),identifier,txt('}')))
).then(id=>({link:id}),err_link);
/* todo так и остаются, но через sequence & alternatives накапливаются и доходят до корня, 
	чтобы можно было осуществить проверку на битые ссылки*/
	
// reg_symbol ::= $reg_char|$quotedSequence|$reg_class|$link;
// bnf_symbol ::= $bnf_char|$quotedSequence|$bnf_class|$link;
// возвращает строку или регексп или ссылку на паттерн
var reg_symbol = any(reg_char,quotedSequence,reg_class,reg_link).then(0,err_char);
var bnf_symbol = any(bnf_char,quotedSequence,bnf_class,bnf_link).then(0,err_char);

//}

//{ ==== другие токены: квантификаторы, модификаторы, обработчики и комментарии ====
test.add_category('/','otherTokens','');

// quantifier ::= [`*+?`] | `{` spc* (`,` spc* num | num (spc* `,` spc* num?)? ) spc* `}` ;
// (?# возвращет объект {min:int,max:int} )
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
	describe('quantifier ::= [`*+?`] | `{`$spcs(`,`$spcs$num|$num($spcs`,`$spcs$num?)?)$spcs`}`\
 (?#пока только энергичные) (?#возвращет объект {min:int,max:int})',()=>{
		it_compile('+'		,{min:1,max:Infinity}	,compile(quantifier))
		it_compile('{3,5}'	,{min:3,max:5}			,compile(quantifier))
		it_compile('{3}'	,{min:3,max:3}			,compile(quantifier))
		it_compile('{3,}'	,{min:3,max:Infinity}	,compile(quantifier))
		it_compile('{,3}'	,{min:0,max:3}			,compile(quantifier))
		it_compile('{ 3 , 5 }',{min:3,max:5}		,compile(quantifier))
	})
})

/* modifier ::= `?`
	(	`!` (?#отрицание)
	|	identifier  `->` (?#back_pattern)
	|	identifier? `=`  (?#имя последовательности)
	|	`toString:`      (?#директива, преобразующая объектную последовательность в строковую)
	);
*/
// (?# возвращет объект {type:string[,data:id]} )
/*
#todo
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
	describe('modifier ::= `?` (`!` | $identifier`->` |	$identifier?`=` | `toString:` );(?#возвращет объект {type:string[,data:id]})'
	,()=>{
		describe('(?#отрицание) `!` (?# при удачном прочтении этой скобочной группы возвращается ошибка, а при неудачном - {err:"continue"} - чтобы если такой результат получит $alternatives, то он продолжил перебирать альтернативы, но если удачных альтернатив больше нет, а некоторый результат уже есть, то он будет возвращен. а $sequence считает, как будто это пустая строка)',()=>{
			it_compile('?!',{type:"not"},compile(modifier))
		})
		describe('(?#back_pattern) $identifier`->` (?# после разбора этого паттерна создается ссылка с этим именем, и паттерном (ввиде строки), равным результату прочтения этого паттерна. Следовательно back_pattern можно указывать только в конкатенирующих последовательностях)',()=>{
			it_compile('?identifier->',{type:"back_pattern",data:"identifier"},compile(modifier))
		})
		describe('(?#имя последовательности) $identifier?`=` (?#в объекте родительской последовательности создает свойство с этим именем, и присваивает туда результат. Если имя пустое, то результат присваивается непрямую в родительский объект.)',()=>{
			it_compile('?identifier=',{type:"returnname",data:"identifier"},compile(modifier))
		})
		describe('`toString:` (?#директива, преобразующая объектную последовательность в строковую)',()=>{
			it_compile('?toString:',{type:"toString"},compile(modifier))
		})
	})
})

// fake_handler ::= (`/*`|`/error*`)(?!`*``/`|.)*`*``/`
//(?#`/*код*``//*=>выр-е*``//*?выр-е по умолчанию*``//error*код*``//error*=>выр-е*``//error*?выр-е по умолчанию*``/`)
// (?# возвращет объект {error:bool,code:Function} )
/*
обработчики все имеют аргументы (arg, pos), 
в качестве this - handler_global_object
error - означает, что обработчик вызовется для ошибки, и сможет изменить сообщение об ощибке.
возвращаемое значение является результатом или сообщением об ошибке.
кинутые исключения - записываются в modifier_throws и error_modifier_throws
	todo: сделать для каждого объекта свой
	а результат становится undefined, а если это обработка ошибки, то она не меняется
в any, rep & opt - чтоб создавали вместо global объект у которого __proto__ = global
в случае удачи - копировали свойства в global, неудачи - просто выкидывали этот объект
+ чтоб родительские свойства были const
*/
var fake_handler = seq(need(0,1,2),
	any(txt('/*').then(()=>({error:false})),txt('/error*').then(()=>({error:true}))),
	opt(any(txt('?').then(()=>({type:'default'})),txt('=>').then(()=>({type:'expr'}))),{type:'code'}),
	rep(exc(txt('*/'),rgx(/./).then(m=>m[0]))).then(merger),
	txt('*/')
).then(([{error},{type},code],x)=>{
	if(type==='default')
		code = 'return arg.length==1?arg[0]:'+code;
	else if(type=='expr')
		code = 'return '+code;
	return {error,code}
});
var fake_handler_schema = {
	type: "object",
	requredProperties: {
		error: { type: "boolean" },
		code: { type: "string" }
	}
}
// handler ::= (`/*`|`/error*`)(?!`*``/`|.)*`*``/`
Parser.prototype.read_handler = function(str,pos) {
	// this.handler_global_object
	return fake_handler.then(({error,code},x)=>{
		try {
			code = (new Function('arg','pos',code));//.bind(this/*!!!*/.handler_global_object);
		}
		catch(err) {
			return new ParseError(x,'синтаксическая ошибка в обработчике',err);
		}
	return {error,code}
	}).exec(str,pos);
}
// Parser.handler = new Pattern(this.read_handler.bind(this)); - в конструкторе
test.add_test('/otherTokens','handler',(path)=>{
	describe('handler ::= (`/*`|`/error*`)(?!`*``/`|.)*`*``/`\
 (?#возвращает {type:"handler",error:bool,code:function}',()=>{
		function it_compile_fun(pattern,obj,arg,res,comment='') {
			it(comment+'"'+pattern+'" ---> '+JSON.stringify(obj)+'   |.data(): '+
				JSON.stringify(arg)+' --> '+JSON.stringify(res),
				()=>{
					var parser = new Parser;
					var prpat = parser.handler.exec(pattern); // prepared pattern
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
		var parser = new Parser;
		it_err_compile('/*=>{return return}*/',()=>new ParseError(0,
				"синтаксическая ошибка в обработчике",
				new SyntaxError("Unexpected token return")
			),compile(parser.handler),'синтаксическая ошибка в обработчике: '
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

/*
// pre_code ::= (\`[^\`]*\`|$object) (`error`|`?`)? `<` (?#обработчик)
// (?#`error` - обработчик ошибки)
// (?#`?` - значение по умолчанию: ?`smth`?< эквивалентно ?`arg.length==1?arg[0]:smth`<);
var pre_code = seq(need(0,1),
	any(
		seq(need(1),txt('`'),
			rgx(/^[^`]* /).then(m=>{  * / поправь
				if(/^\s*\{/.test(m[0]) && /\}\s*$/.test(m[0]))
					return {type:'code',data:m[0]}
				else
					return {type:'expr',data:m[0]}
			}),
			txt('`')),
		object.then(s=>({type:'obj',data:s}))
	),
	opt(any(txt('error'),txt('?')),''),
	txt('<')
).then(([o,mod],x)=>{
	if(mod=='?')
		if(o.type=='code') return new ParseError(x,
			'код не может быть значением по умолчанию (только выражением или объектом)');
		else
			o.data = 'arg.length==1?arg[0]:'+o.data;
	if(o.type=='expr' || o.type=='obj')
		o.data = 'return '+o.data;
	o.type = 'postscript';
	o.error = mod==='error';
	return o;
});
test.add_test('/','pre_code',(path)=>{
	describe('pre_code ::= (\`[^\`]*\`|$object) (`error`|`?`)? `<` (?#обработчик) \
(?#`error` - обработчик ошибки) \
(?#`?` - значение по умолчанию: ?`smth`?< эквивалентно ?`arg.length==1?arg[0]:smth`<);',()=>{
		it_compile('{obj:5}<'       ,{type:"postscript",data:"return {obj:5}",
			error:false},compile(pre_code));
		it_compile('{obj:5}error<'  ,{type:"postscript",data:"return {obj:5}",
			error:true},compile(pre_code));
		it_compile('{obj:5}?<'      ,{type:"postscript",data:"return arg.length==1?arg[0]:{obj:5}",
			error:false},compile(pre_code));
			
		it_compile('`arg`<'         ,{type:"postscript",data:"return arg",
			error:false},compile(pre_code));
		it_compile('`arg`error<'    ,{type:"postscript",data:"return arg",
			error:true},compile(pre_code));
		it_compile('`arg`?<'        ,{type:"postscript",data:"return arg.length==1?arg[0]:arg",
			error:false},compile(pre_code));

		it_compile('`{return arg}`<'     ,{type:"postscript",data:"{return arg}",
			error:false},compile(pre_code));
		it_compile('`{return arg}`error<',{type:"postscript",data:"{return arg}",
			error:true},compile(pre_code));
		it_err_compile('`{return arg}`?<',()=>new ParseError(0,
			'код не может быть значением по умолчанию (только выражением или объектом)'),
			compile(pre_code));
	})
})

// code ::= $pre_code (?# строка превращается в функцию)
	// todo пока глобальный, но потом будет инициализироваться перед парсингом паттерна
var code = pre_code.then((m,x)=>{ 
	try {
		m.data = (new Function('arg','pos',m.data)).bind(handler_global_object); 
	}
	catch(err) {
		return new ParseError(x,'синтаксическая ошибка в обработчике',err);
	}
	return m
})
*/

var comment = new Forward();
var fake_reg_alternatives = new Forward;

/* fake_reg_sequence ::=
	modifier*
	(( reg_symbol | comment | `(` (modifier* `*`)? fake_reg_alternatives `)`)
		quantifier? fake_handler*)*
	`*`? fake_handler*;
*/
var err_reg_sequence = (x,e)=>new FatalError(x,'не могу прочитать reg_sequence',e);
exports.err_reg_sequence = err_reg_sequence;
var fake_reg_sequence = seq(need_none,
	rep(modifier),
	rep(seq(need_none,
		any(
			reg_symbol,
			comment,
			seq(need_none,
				txt('('),
				opt(seq(need_none,rep(modifier),txt('*')),[]),
				fake_reg_alternatives,
				txt(')')
			)
		),
		opt(quantifier),
		rep(fake_handler)
	)),
	opt(txt('*')),
	rep(fake_handler)
).then(0,err_reg_sequence);

// fake_reg_alternatives ::= fake_reg_sequence (`|` fake_reg_sequence)*;
fake_reg_alternatives.pattern = seq(need_none,fake_reg_sequence,rep(seq(need_none,txt('|'),fake_reg_sequence)));

// comment ::= `(?#` (modifier* `*`)? fake_reg_alternatives `)`
comment.pattern = seq(need_none,
	txt('(?#'),	opt(seq(need_none,rep(modifier),txt('*'))),fake_reg_alternatives,txt(')')
).then(0,(x,e)=>err_in(x,'comment',e));

test.add_test('/otherTokens','comment',(path)=>{
	describe('comment ::= `(?#` (modifier* `*`)? fake_reg_alternatives `)`',()=>{
		it_compile('(?#[\ \r\n\t\v\f])'		,[]	,compile(comment))
		it_compile('(?#(modifier spcs)*\
	(( bnf_symbol | comment | `(` spcs ((modifier spcs)* `*` spcs)? bnf_alternatives_ `)`) spcs\
		(quantifier spcs)? (handler spcs)*)*\
	(`*` spcs)? (handler spcs)*)'		,[]	,compile(comment))
	})
})

//}

//{ ==== синтаксис ядра ====
var pos_adder = (m,x)=>{m.pos = x; return m;};

/* reg_sequence ::=
	modifier* handler*
	(( reg_symbol | comment | `(` (modifier+ `*`)? reg_alternatives `)`)
		quantifier? handler*)*
	`*`? handler*;
*/
var err_seq_c_modifiers = x=>new ParseError(x,'модификаторы цикла можно задавать только для цикла');
exports.err_seq_c_modifiers = err_seq_c_modifiers;
Parser.prototype.read_reg_sequence = function(str,pos) {
	var data = seq({
		modifiers: rep(modifier.then(pos_adder)), // модификаторы
		begin_handlers: rep(this.handler.then(pos_adder)),
		patterns: rep(seq({
				pattern: any( // паттерны
					reg_symbol.then((symbol,x)=>(
						typeOf(symbol)==='object'
						? {type:'link',link:symbol.link,pos:x}
						: {type:'symbol',symbol,pos:x}
					)),
					comment.then((comment,x)=>({type:'comment',pos:x})),
					seq({
						none1: txt('('),
						cycle_modifiers: opt(seq(need(0),rep(modifier.then(pos_adder),{min:1}),txt('*')),[]),
						pattern: this.reg_alternatives,
						end: txt(')').then((m,x)=>x)
					}).then(({cycle_modifiers,pattern/*{mode,fun,direct}*/,end},x)=>{
						pattern.type="pattern"
						pattern.cycle_modifiers = cycle_modifiers;
						pattern.pos = x;
						pattern.end = end;
						return pattern;
					})
				),
				quant: opt(quantifier.then(pos_adder),null),
				handlers: rep(this.handler.then(pos_adder))
		})).then(({pattern,quant,handlers},x)=>{
			pattern.handlers = handlers;
			if(pattern.type === 'pattern') {
				if(quant) {
					pattern.type = 'cycle';
					pattern.quant = quant
				}
				else if(pattern.cycle_modifiers.length>0)
					return err_seq_c_modifiers(x);
				else
					delete pattern.cycle_modifiers;
			}
			else
				pattern.quant = quant
			return pattern;
		}),
		separator: opt(txt('*'),null),
		handlers: rep(this.handler.then(pos_adder))
	}).then(
		(data)=>{
			if(!data.separator && data.patterns.length>0) {
				let lp = data.patterns[data.patterns.length-1]; //last pattern
				data.handlers = data.handlers.concat(lp.handlers); // (abc/*handler*/) -> (abc*/*handler*/)
				lp.handlers = [];
			}
			delete data.separator;
			return data
		}
	,err_reg_sequence).exec(str,pos);
	return this.sequence_compiler(data,pos.x);
}
// Parser.reg_sequence = new Pattern(this.read_reg_sequence.bind(this)); - в конструкторе

// reg_alternatives ::= reg_sequence (`|` reg_sequence)*;
Parser.prototype.read_reg_alternatives = function(str,pos) {
	var data = seq(need_all,this.reg_sequence,rep(seq(need(1),txt('|'),this.reg_sequence))).exec(str,pos);
	return this.alternatives_compile(data);
}
// Parser.reg_alternatives = new Pattern(this.read_reg_alternatives.bind(this)); - в конструкторе
	
/* bnf_sequence_ ::=
	(modifier spcs)* (handler spcs)*
	(( bnf_symbol | comment | `(` spcs ((modifier spcs)+ `*` spcs)? bnf_alternatives_ `)`) spcs
		(quantifier spcs)? (handler spcs)*)*
	(`*` spcs)? (handler spcs)*;
*/
Parser.prototype.read_bnf_sequence_ = function(str,pos) {
	var data = seq({
		modifiers: rep(seq(need(0),modifier.then(pos_adder),spcs)), // модификаторы
		begin_handlers: rep(seq(need(0),this.handler.then(pos_adder),spcs)),
		patterns: rep(seq({
				pattern: any( // паттерны
					bnf_symbol.then((symbol,x)=>(
						typeOf(symbol)==='object'
						? {type:'link',link:symbol.link,pos:x}
						: {type:'symbol',symbol,pos:x}
					)),
					comment.then((comment,x)=>({type:'comment',pos:x})),
					seq({
						none1: txt('('),
						none2: spcs,
						cycle_modifiers: opt(seq(need(0),rep(
							seq(need(0),modifier.then(pos_adder),spcs),{min:1}),txt('*'),spcs),[]),
						pattern: this.bnf_alternatives_,
						end: txt(')').then((m,x)=>x),
						none3:spcs
					}).then(({cycle_modifiers,pattern/*{mode,fun,direct}*/,end},x)=>{
						pattern.type="pattern"
						pattern.cycle_modifiers = cycle_modifiers;
						pattern.pos = x;
						pattern.end = end;
						return pattern;
					})
				),
				quant: opt(seq(need(0),quantifier.then(pos_adder),spcs),null),
				handlers: rep(seq(need(0),this.handler.then(pos_adder),spcs))
		})).then(({pattern,quant,handlers},x)=>{
			pattern.handlers = handlers;
			if(pattern.type === 'pattern') {
				if(quant) {
					pattern.type = 'cycle';
					pattern.quant = quant
				}
				else if(pattern.cycle_modifiers.length>0)
					return err_seq_c_modifiers(x);
				else
					delete pattern.cycle_modifiers;
			}
			else
				pattern.quant = quant
			return pattern;
		}),
		separator: opt(seq(need(0),txt('*'),spcs),null),
		handlers: rep(seq(need(0),this.handler.then(pos_adder),spcs))
	}).then(
		(data)=>{
			if(!data.separator && data.patterns.length>0) {
				let lp = data.patterns[data.patterns.length-1];
				data.handlers = data.handlers.concat(lp.handlers);
				lp.handlers = [];
			}
			delete data.separator;
			return data
		}
	,err_reg_sequence).exec(str,pos);
	return this.sequence_compiler(data,pos.x);
}
// Parser.bnf_sequence_ = new Pattern(this.read_bnf_sequence_.bind(this)); - в конструкторе

// bnf_alternatives_ ::= bnf_sequence_ (`|` spcs bnf_sequence_)*;
Parser.prototype.read_bnf_alternatives_ = function(str,pos) {
	var data = seq(need_all,this.bnf_sequence_,rep(seq(need(2),txt('|'),spcs,this.bnf_sequence_))).exec(str,pos);
	return this.alternatives_compile(data);
}
// Parser.bnf_alternatives_ = new Pattern(this.read_bnf_alternatives_.bind(this)); - в конструкторе
	
//}

// по сути просто комментарии:
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
			items: {
				oneOf: [
					{
						type:"object",
						requiredProperties: {
							type: { enum:["comment"] },
							pos: { type: "integer" },
							quant: {
								oneOf: [
									{ type:"null" },
									{ $ref: "#/definitions/pos_quantifier_schema" }
								]
							},
							handlers: { $ref: "#/definitions/handlers_schema" }
						}
					},
					{
						type:"object",
						requiredProperties: {
							type: { enum:["symbol"] },
							symbol: { $ref: "symbol_schema" },
							pos: { type: "integer" },
							quant: {
								oneOf: [
									{ type:"null" },
									{ $ref: "#/definitions/pos_quantifier_schema" }
								]
							},
							handlers: { $ref: "#/definitions/handlers_schema" }
						}
					},
					{
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
							},
							handlers: { $ref: "#/definitions/handlers_schema" }
						}
					},
					{
						type:"object",
						requiredProperties: {
							type: { enum:["pattern"] },
							pos: { type: "integer" },
							end: { type: "integer" },
							mode: {/*...*/},
							fun: {/*...*/},
							direct: {/*...*/},
							handlers: { $ref: "#/definitions/handlers_schema" }
						}
					},
					{
						type:"object",
						requiredProperties: {
							type: { enum:["cycle"] },
							pos: { type: "integer" },
							end: { type: "integer" },
							mode: {/*...*/},
							fun: {/*...*/},
							direct: {/*...*/},
							quant: { $ref: "#/definitions/pos_quantifier_schema" },
							cycle_modifiers: { $ref: "#/definitions/modifiers_schema" },
							handlers: { $ref: "#/definitions/handlers_schema" }
						}
					}
				]
			}
		}
	}
};

//{ ==== ядро ====
/* есть 3 типа "функций":
	последовательность (символов, "функций" и т.д.)
		может иметь идущие в начале модификаторы, каждый начинается с ?
		и идущие в конце обработчики, заключенные в / * * /
		обработчики могут идти после каждого символа,
		но обработчики в конце последовательности относятся именно к последовательности, а не к последнему символу
		если нужно отнести обработчики только к последнему символу, поле них ставится *
	перечисление альтернатив-последовательностей (через |)
	цикл/массив - скобки с квантификатором
		также сам может иметь модификаторы, которые отделяются от 
		модификаторов первой последовательности звездочкой *
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

	объектная функция* может иметь обработчики только если имеет (возможно пустое) имя

	функции*, у которых задано пустое имя
		имеют атрибут direct
	если функция* вызывает хотябы одну функцию, которая direct
		то она обязана иметь (возможно пустое) имя
			но если имя не указано, считается, как будто указано пустое имя
	если цикл является объектным, он обязан иметь (возможно пустое) имя или атрибут toString
	
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
	перечисления передают переданный им объект на прямую в каждую альтернативу-перечисление
=== как функции получают результат ===
	конкатенирующие функции* передают-получают результаты по ссылке
	объектные функции* передают свой объект для модификации только в объектные функции, 
		а в конкатенирующие - фейковый объект, который не используется
	объектные циклы на каждой итерации создают и передают объект для модификации
		после чего добавляют его в свой массив, который является результирующим объектом
		
	* - последовательности и циклы
	** - перед возвращением модификатор-обработчик может превратить
		объект или строку в значение любого типа
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

var perr_double_names = x=>new ParseError(x,'повторно заданное имя');
exports.perr_double_names = perr_double_names;
var perr_double_bpatterns = x=>new ParseError(x,'повторно заданное имя обратного паттерна');
exports.perr_double_bpatterns = perr_double_bpatterns;
var perr_obj_handlers = x=>new ParseError(x,'объектная последовательность может иметь обработчики, только если указано (возможно пустое) имя');
exports.perr_obj_handlers = perr_obj_handlers;
var err_fail_not = (x,name)=> new FatalError(x,'удалось прочитать то, что не должно быть прочитано: '+name)
exports.err_fail_not = err_fail_not;

Parser.prototype.cycle_compiler = function cycle_compiler(pattern) {
	
}

Parser.prototype.sequence_compiler = function sequence_compiler({modifiers,begin_handlers,handlers,patterns},pattern_x) {
// 1) подбирает, какую функцию вернуть, а также возвращает режим (mode: cat/obj, direct:true/false)
// 2) каждая из этих функций использует замыкание на данную(sequence_compiler) функцию

	var parse_errors = [];
	
	// handlers - будет обрабатываться в конце каждой функции
	var error_handlers = [];
	for(var i=handlers.length-1; i>=0; i--)
		if(handlers[i].error) {
			error_handlers.unshift(handlers[i]);
			handlers.splice(i,1);
		}
	for(var i=begin_handlers.length-1; i>=0; i--)
		if(begin_handlers[i].error) {
			begin_handlers.splice(i,1);
		}
	// а еще в каждом паттерне такое есть
	for(var j=0; j<patterns.length; j++) {
		patterns[j].error_handlers = [];
		for(var i=patterns[j].handlers.length-1; i>=0; i--)
			if(patterns[j].handlers[i].error) {
				patterns[j].error_handlers.unshift(patterns[j].handlers[i]);
				patterns[j].handlers.splice(i,1);
			}
	}

	// модификаторы, после этого они больше не нужны
	var not = false;
	var name = null;
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
	
	//	символы (в т.ч. ссылки на паттерны) имеют тип 'cat' и не имеют атрибута direct
	var mode = 'cat'; // конкатенирующая или объектная (не тип cat/obj)
	var has_direct = -1;// позиция используется в сообщениях об ошибках

	// patterns
	var compressed_patterns = [];
	var cache = [];
	/*
	создаем массив паттернов, которые будет вызывать e_sequence:
		последовательность символов объединяем в один регексп
		для cycle создаем функцию и преобразуем в pattern (#todo)
	*/
	try{ patterns.forEach(m=>{
		if(m.type === 'symbol' && m.handler.length===0 && m.error_handler.length===0) {
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
			//	функция является объектной, если хотябы одна из функций, которую она вызывает, 
			//		имеет тип obj, иначе функция является конкатенирующей
			if(m.type === 'symbol' || m.type === 'link') {
				compressed_patterns.push(m);
			}
			else if(m.type === 'pattern') {
				if(m.mode==='obj') mode = 'obj';
				if(has_direct<m.direct) has_direct = m.direct;
				compressed_patterns.push(m);
			}
			else if(m.type === 'cycle') {
				this.cycle_compiler(m);
				if(m.mode==='obj') mode = 'obj';
				if(has_direct<m.direct) has_direct = m.direct;
				compressed_patterns.push(m);
			}
			else if(m.type === 'comment') {
				// nothing
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
	//	объектная функция* может иметь обработчики только если имеет (возможно пустое) имя
	if(mode==='obj' && modifiers.length>0 && name===null)
		parse_errors.push(perr_obj_handlers(pattern_x));
	// накопленные ошибки
	if(parse_errors.length>0) {
		if(parse_errors.length===1)
			return parse_errors[0];
		else
			return new ParseError(pattern_x,'',parse_errors);
	}

	//	=== определение типа функции, и какой она является ===
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

	/*
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
	/*
	=== описание обработчиков ===
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
			если в одном из обработчиков возникло прерывание
				очередь останавливается, 
				прерывание обертывается* в парсинговаую или фатальную ошибку (с позицией в тексте и в коде)
					(в зависимости от типа ошибки, которая попала на вход обработчика),
				и возвращаются все накопленные ошибки или ошибка добавляется массив парсинговых ошибок
					(в зависимости от типа ошибки, которая попала на вход обработчика),
		если в конце имеются парсинговые ошибки, они оборачиваются* парсинговую ошибку, которая затем возвращается
		* - обертывание:
			одна ошибка не обертывается и возвращается как есть
			2 и более обертываются с указанием иени (если есть) или 'undefined' (err_in)
		при выходе из предложения БНФ любая ошибка также обертывается(даже одна) в err_in(имя предложения)
				
		вначале каждой последовательности выполняются begin_hendlers (очередь ошибок игнорируется)
			а также игнорируются результаты undefined
			
	*/
	var self = this;
	function handle(res,pos,handlers,error_handlers) {
		if(!error_handlers) {
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
		else if(isGood(res)) {
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
		}
		else {
			var type = isFatal(res); // true не должно поменяться на false
			for(var i=0; i<error_handlers.length; i++) {
				try{
					res = error_handlers[i].code.call(self.handler_global_object,res,pos);
				}
				catch(e) {
					if(type)
						return new FatalError(pos,'Произошло исключение в обработчике на позиции '+
							error_handlers[i].pos,e);
					else
						return new ParseError(pos,'Произошло исключение в обработчике на позиции '+
							error_handlers[i].pos,e);
				}
				if(type && !isFatal(res))
					return new FatalError(pos,'Обработчик получил фатальную ошибку, а вернул парсинговую на позиции '+
							error_handlers[i].pos,e);
				type = isFatal(res); // true не должно поменяться на false
			}
		}
	}
	/*
	=== как функции получают результат ===
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
			self.handler_global_object = self.handler_global_object.__proto;
			return arg;
		}
		
		var tmpres = handle(undefined,X,begin_handlers);
		if(tmpres!==undefined && isFatal(tmpres)) {
			parse_errs.push(tmpres);
			if(parse_errs.length===1)
				return before_return(parse_errs[0]);
			else
				return before_return(err_in(X,name?name:'unnamed group',parse_errs));
		}
		else if(tmpres!==undefined && !isGood(tmpres))
			parse_errs.push(tmpres);
			
		for(var i=0; i<compressed_patterns.length; i++) {
			if(compressed_patterns[i] instanceof RegExp) {
				var m;
				if(m = compressed_patterns[i].exec(str.slice(pos.x))) {
					pos.x += m.index + m[0].length;
					inres.push(m[0]);
				}
				else
					return before_return(err_rgx(pos.x,compressed_patterns[i].source.slice(1)));
			}
			else if(compressed_patterns[i].type==='pattern') {
				/* если не строка, то stringifyцируем, 
				   если FatalError - возвращаем FatalError+обработка ошибок
					+ если задано name - обернуть в новый FatalError и завершить
				*/
				if(compressed_patterns[i].mode!=='cat') throw new Error('происходит вызов объектного паттерна из конкатенирующего');
				var back_res = {res:{}}; 
					// паттерн может оказаться объектным, а он считает, что back_res.res уже объект
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
			else if(compressed_patterns[i].type==='symbol') {
				
			}
			else if(compressed_patterns[i].type==='link') {
				// #todo поиск функции, а потом вызов как при pattern
			}
			else throw new Error('неизвестный тип паттерна');
		}

		set_res_cat(res,modify_result(modifiers,inres.join(''),X,pos.x),name)
		return true;
	}
	/*
		объектные функции* передают свой объект для модификации только в объектные функции, 
			а в конкатенирующие - фейковый объект, который не используется
	*/
	function obj_sequence(str,pos,res) { // name, compressed_patterns, handlers, error_handlers, self - closure
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
}

//}

//{ ==== тесты ядра ====

//}

function Parser() {
	this.tail_error = [];
	this.handler_global_object = {ParseError,FatalError};
	this.handler = new Pattern(this.read_handler.bind(this));
	this.reg_sequence = new Pattern(this.read_reg_sequence.bind(this));
	this.reg_alternatives = new Pattern(this.read_reg_alternatives.bind(this));
	this.bnf_sequence_ = new Pattern(this.read_bnf_sequence_.bind(this));
	this.bnf_alternatives_ = new Pattern(this.read_bnf_alternatives_.bind(this));
/* expr main
expr ::= $spcs $identifier $spcs (`:=`$reg_alternatives | `::=` $spcs $bnf_alternatives $spcs );
main ::= $expr(`;` $comment* $expr)* `;`? ;
*/

} //function Parser()

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
