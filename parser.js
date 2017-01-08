// требует utils
;(function(){
function main(module, exports, require) {
"use strict";

copyProps(require('meta_parser'),window);
var test = require('parser_test_utils');

/* todo
закодить объектные и toString - тесты
распределить старые тесты по имеющимся рубрикам и в фишка code
задать расположение фишки link & back_pattern, и немного позаполнять
сделать тесты для синтаксиса:
reg_sequence ::= $modifier* ($link |
(	    $reg_symbol $quantifier?
| 	`(`   (     $modifier*        `*`)?           $reg_alternatives       `)` $quantifier?
|	$comment
)*);
fake_reg_sequence ::= $fake_modifier* ($link |
(	    $reg_symbol $quantifier? (?#пробелы в reg_class и quantifier допустимы)
| 	`(`   ($fake_modifier*        `*`)?      $fake_reg_alternatives       `)` $quantifier?
|	$comment
)*);
bnf_sequence ::= $modifier* ($spcs $link |
($spcs(	$bnf_symbol $quantifier?
| 	`(`   (     $modifier* $spcs  `*`)? $spcs     $bnf_alternatives $spcs `)` $quantifier?
|	$comment
))*);
reg_alternatives      ::= $reg_sequence      (      `|`$reg_sequence     )*;
fake_reg_alternatives ::= $fake_reg_sequence (      `|`$fake_reg_sequence)*;
bnf_alternatives      ::= $bnf_sequence      ($spcs `|`$bnf_sequence     )*;
comment ::= `(?#` ($fake_modifier*     `*`)? $fake_reg_alternatives       `)` $quantifier?
	внутренний синтаксис reg_sequence
	внутренний синтаксис bnf_sequence
	внутренний синтаксис reg_alternatives
	внутренний синтаксис bnf_alternatives
	внутренний синтаксис comment
	синтаксис reg_sequence bnf_sequence reg_alternatives bnf_alternatives comment

сделать интерфейс для одиночного безымянного паттерна, потестировать все (ошибки добавляем в тесты)
сделать expr, main и еще потестировать
npm, статья
*/

/* todo старое
придумать систему сообщений об ошибках
дальше все остальное

red._add(name,opts,regexp,fun)
red._remove(name)
red._main = name
red._exec(str)
опции: 
	синтаксис больше похож на БНФ или на регулярки
	function toLowercase
*/

/* === синтаксис ===
spc :=[\ \r\n\t\v\f];
spcs:=$spc*;
num :=<[0-9]+;
identifier :=[a-zA-Z_][a-zA-Z_0-9]*;
quotedSequence ::=`\`` ( [^\`\\] | `\\\`` | `\\\\`)* `\`` ;

reg_char :=[^\\\/\``;|$.*+?()[]{}`]|\\.;
	(?#здесь перечислены управляющие символы, остальные символы считаются обычными)
bnf_char :=\\.;
	(?#любые символы считаются управляющими, обычные символы надо брать в кавычки или экранировать)
reg_classChar ::= [^\\\/\``^-;|$.*+?()[]{}`] | `\\`.
	(?#к управляющим символам добавляется `^-`, пробелы разрешены);
bnf_classChar ::= [^\\\/\``^-;|$.*+?()[]{} `]| `\\`.
	(?#к управляющим символам добавляется `^-`, пробелы запрещены);
reg_class ::= `.` | `[``^`?       ($reg_classChar(`-`$reg_classChar)?       |$quotedSequence      )*`]`;
bnf_class ::= `.` | `[``^`? $spcs ($bnf_classChar(`-`$bnf_classChar)? $spcs |$quotedSequence $spcs)*`]`;

link ::= ?`arg.id`< `$` ( ?id=$identifier | `{` (?id=$identifier) `}` );
reg_symbol ::= $reg_char|$quotedSequence|$reg_class|$link;
bnf_symbol ::= $bnf_char|$quotedSequence|$bnf_class|$link;
quantifier ::= [`*+?`] | `{`$spc*(`,`$spc*$num|$num($spc*`,`$spc*$num?)?)$spc*`}` 
	(?#пока только энергичные);

string ::= `'` ([^'\\]|\\'|\\\\)* `'` | `"` ([^"\\]|\\"|\\\\)* `"`;
object ::= `{` ([^'"\{\}] | $string | $object)* `}`;
modifier ::= `?`
(	`!` (?#отрицание)
|	(\`[^\`]*\`|$object) (`error`|`?`)? `<` (?#обработчик)
(?#`error` - обработчик ошибки)
(?#`?` - значение по умолчанию: ?`smth`?< эквивалентно ?`arg.length==1?arg[0]:smth`<)
|	$identifier`->` (?#back_pattern)
|	$identifier?`=` (?#имя последовательности)
|	`toString:` (?#директива, преобразующая объектную последовательность в строковую)
);
fake_modifier ::= `?`
(	`!`
|	(\`[^\`]*\`|$object) (`error`|`?`)? `<`
|	$identifier`->`
|	$identifier?`=`
|	`toString:`
);

(?#fake_... - синтаксис такой же как у настоящего, только не происходит обработка)
comment ::= `(?#` ($fake_modifier*     `*`)? $fake_reg_alternatives       `)` $quantifier?
reg_sequence ::= $modifier* ($link |
(	    $reg_symbol $quantifier?
| 	`(`   (     $modifier*        `*`)?           $reg_alternatives       `)` $quantifier?
|	$comment
)*);
fake_reg_sequence ::= $fake_modifier* ($link |
(	    $reg_symbol $quantifier? (?#пробелы в reg_class и quantifier допустимы)
| 	`(`   ($fake_modifier*        `*`)?      $fake_reg_alternatives       `)` $quantifier?
|	$comment
)*);
bnf_sequence ::= $modifier* ($spcs $link |
($spcs(	$bnf_symbol $quantifier?
| 	`(`   (     $modifier* $spcs  `*`)? $spcs     $bnf_alternatives $spcs `)` $quantifier?
|	$comment
))*);
reg_alternatives      ::= $reg_sequence      (      `|`$reg_sequence     )*;
fake_reg_alternatives ::= $fake_reg_sequence (      `|`$fake_reg_sequence)*;
bnf_alternatives      ::= $bnf_sequence      ($spcs `|`$bnf_sequence     )*;

expr ::= $spcs $identifier $spcs (`:=`$reg_alternatives | `::=` $spcs $bnf_alternatives $spcs );
main ::= $expr(`;` $comment? $expr)* `;`? ;
*/

Error.prototype.toJSON = function(){ return {name:this.name,message:this.message} }
var merger = (arr)=>{
	var r = arr.join('');
	//console.log('merge: '+r);
	return r;
}
var err_in = (x, what, why)=>new FatalError(x,'in '+what,why)

// ================================================================================================
/* spc spcs num identifier quotedSequence
spc :=[\ \r\n\t\v\f];
spcs:=$spc*;
num :=[0-9]+;
identifier :=[a-zA-Z_][a-zA-Z_0-9]*;
quotedSequence ::=`\`` ( [^\`\\] | `\\\`` | `\\\\`)* `\`` ;
*/
//{
var err_spc = (x)=>new FatalError(x,'ожидался пробельный символ');
exports.err_spc = err_spc;
var spc = rgx(/^[\ \r\n\t\v\f]/).then(0,err_spc);
//exports.spc = spc;
var spcs = rep(spc,star).then(r=>'');

var err_num = (x)=>new FatalError(x,'ожидалось число');
exports.err_num = err_num;
var num = rgx(/^[0-9]+/).then(m=>+m[0],err_num);

var err_id = (x)=>new FatalError(x,'ожидался идентификатор');
exports.err_id = err_id;
var identifier = rgx(/^[a-zA-Z_][a-zA-Z_0-9]*/).then(m=>m[0],err_id)

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
//exports.quotedSequence = quotedSequence;
test.add_test('/','quotedSequence',(path)=>{
	describe('quotedSequence ::='+/`\`` ( [^\`\\] | `\\\`` | `\\\\`)* `\``/.source+
			' (?#возвращает строку)',()=>{
		it_compile(	/`qwer`/.source		,'qwer'			,compile(quotedSequence))
		it_compile(	/`qw\\er`/.source	,'qw\\er'		,compile(quotedSequence))
		it_compile(	/`qw\`er`/.source	,'qw`er'		,compile(quotedSequence))
		it_compile(	/`qw\\\`er`/.source	,'qw\\`er'		,compile(quotedSequence))
		it_err_compile(	""				,()=>err_qseq(0),compile(quotedSequence))
	})
})
//}
// ================================================================================================
/* reg-char bnf-char reg-classChar bnf-classChar reg-class bnf-class
reg_char :=[^\\\/\``;|$.*+?()[]{}`]|\\.;
	(?#здесь перечислены управляющие символы, остальные символы считаются обычными)
bnf_char :=\\.;
	(?#любые символы считаются управляющими, обычные символы надо брать в кавычки или экранировать)
reg_classChar ::= [^\\\/\``^-;|$.*+?()[]{}`] | `\\`.
	(?#к управляющим символам добавляется `^-`, пробелы разрешены) ;
bnf_classChar ::= [^\\\/\``^-;|$.*+?()[]{} `]| `\\`.
	(?#к управляющим символам добавляется `^-`, пробелы запрещены) ;
reg_class ::= `.` | `[``^`?       ($reg_classChar(`-`$reg_classChar)?       |$quotedSequence      )*`]` ;
bnf_class ::= `.` | `[``^`? $spcs ($bnf_classChar(`-`$bnf_classChar)? $spcs |$quotedSequence $spcs)*`]` ;
*/
//{
// возвращает символ
var err_char = (x)=>new FatalError(x,'ожидался символ');
// reg_char :=[^\\\/\``;|$.*+?()[]{}`]|\\.;
//	(?#здесь перечислены управляющие символы, остальные символы считаются обычными)
exports.err_char = err_char;
var reg_char = rgx(/^[^\\\/`;\|\$\.\*\+\?\(\)\[\]\{\}]|\\./).then(
	m=>m[0].replace(/\\(.)/,'$1'),
	err_char
);
//exports.reg_char = reg_char;
test.add_test('/','reg_char',(path)=>{
	describe('reg_char ::='+/[^\\\/\``;|$.*+?()[]{}`] | \\./.source+' (?#возвращает символ) (?#здесь перечислены управляющие символы, остальные символы считаются обычными)',()=>{
		it_compile(		'1'		,'1'			,compile(reg_char))
		it_err_compile(	'$'		,()=>err_char(0),compile(reg_char))
		it_compile(		'\\$'	,'$'			,compile(reg_char))
		it_err_compile(	""		,()=>err_char(0),compile(reg_char))
	})
})
// bnf_char :=\\.;
// (?#любые символы считаются управляющими, обычные символы надо брать в кавычки или  экранировать)
var bnf_char = rgx(/^\\(.)/).then(
	m=>m[1],
	err_char
);
//exports.bnf_char = bnf_char;
test.add_test('/','bnf_char',(path)=>{
	describe('bnf_char ::= '+/\\./.source+' (?#возвращает символ) \
(?#любые символы считаются управляющими, обычные символы надо брать в кавычки или экранировать)',
	()=>{
		it_compile    ('\\1','1'            ,compile(bnf_char))
		it_err_compile('1'	,()=>err_char(0),compile(bnf_char))
		it_err_compile('$'	,()=>err_char(0),compile(bnf_char))
		it_err_compile(''	,()=>err_char(0),compile(bnf_char))
	})
})

// возвращает символ
var err_classChar = (x)=>new FatalError(x,'ожидался символ класса');
exports.err_classChar = err_classChar;
// reg_classChar ::= [^\\\/\``^-;|$.*+?()[]{}`] | `\\`.
//		(?#к управляющим символам добавляется `^-`, пробелы разрешены);
var reg_classChar = rgx(/^[^\^\-\\\/`;\|\$\.\*\+\?\(\)\[\]\{\}]|\\./).then(
	m=>m[0].replace(/\\(.)/,'$1'),
	err_classChar
);
//exports.reg_classChar = reg_classChar;
test.add_test('/','reg_classChar',(path)=>{
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
//	bnf_classChar ::= [^\\\/\``^-;|$.*+?()[]{} `]| `\\`.
//		(?#к управляющим символам добавляется `^-`, пробелы запрещены) ;
var bnf_classChar = rgx(/^[^\^\-\\\/`;\|\$\.\*\+\?\(\)\[\]\{\}\ ]|\\./).then(
	m=>m[0].replace(/\\(.)/,'$1'),
	err_classChar
);
//exports.bnf_classChar = bnf_classChar;
test.add_test('/','bnf_classChar',(path)=>{
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

// возвращает регексп (без галки вначале)
var escaper = (s)=>{
	var r = s.replace(/([\^\-\ \\\/\|\$\.\*\+\?\(\)\[\]\{\}])/g,'\\$1');
	//console.log('replace: '+r);
	return r;
}
var err_inClass = (x,why)=>new FatalError(x,'в классе',why);
exports.err_inClass = err_inClass;
//	reg_class ::= `.` | `[``^`? ($reg_classChar(`-`$reg_classChar)? |$quotedSequence )*`]` ;
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
//exports.reg_class = reg_class;
test.add_test('/','reg_class',(path)=>{
	describe('reg_class ::= `.`|`[``^`? ($reg_classChar(`-`$reg_classChar)? |$quotedSequence )*`]`'
	+' (?#возвращает регексп (без галки вначале))',()=>{
		it_err_compile(	''			,()=>err_filtered(0,[err_txt(0,'.'),err_txt(0,'[')]),
			compile(reg_class));
		it_compile(		'.'			,/./												,
			compile(reg_class))
		it_err_compile(	'['			,()=>err_filtered(1,[
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
		it_err_compile(	'[a-]'		,()=>err_filtered(3,[
			err_classChar(3),err_classChar(2),err_qseq(2),err_txt(2,']'),err_txt(0,'.')]),
			compile(reg_class))
		it_compile(		'[a\\-]'	,/[a\-]/											,
			compile(reg_class))
	})
})
// bnf_class ::= `.` | `[``^`? $spcs ($bnf_classChar(`-`$bnf_classChar)? $spcs 
//	|$quotedSequence $spcs)*`]` ;
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
//exports.bnf_class = bnf_class;
test.add_test('/','bnf_class',(path)=>{
	describe('bnf_class ::= `.` | `[``^`? $spcs ($bnf_classChar(`-`$bnf_classChar)? $spcs \
|$quotedSequence $spcs)*`]` (?#возвращает регексп (без галки вначале))',()=>{
		it_compile('[ \\a \\b \\c ]',/[abc]/,compile(bnf_class))
	});
})
//}
// ================================================================================================
/* link reg-symbol bnf-symbol quantifier
link ::= ?`arg.id`< `$` ( ?id=$identifier | `{` (?id=$identifier) `}` );
reg_symbol ::= $reg_char|$quotedSequence|$reg_class|$link;
bnf_symbol ::= $bnf_char|$quotedSequence|$bnf_class|$link;
quantifier ::= [`*+?`] | `{`$spcs(`,`$spcs$num|$num($spcs`,`$spcs$num?)?)$spcs`}` 
	(?#пока только энергичные);
*/
//{
// возвращает ссылку на паттерн
var err_link = (x)=>new FatalError(x,'ожидалась ссылка');
exports.err_link = err_link;
var link = seq(need(1),txt('$'),
	any(collect,identifier,
		seq(need(1),txt('{'),identifier,txt('}')))
).then(id=>({link:id}),err_link);
/* todo так и остаются, но через sequence & alternatives накапливаются и доходят до корня, 
	чтобы можно было осуществить проверку на битые ссылки*/

// возвращает строку или регексп или ссылку на паттерн
var reg_symbol = any(collect,reg_char,quotedSequence,reg_class,link).then(0,err_char);
var bnf_symbol = any(collect,bnf_char,quotedSequence,bnf_class,link).then(0,err_char);

// возвращет объект {min:int,max:int}
var err_quant = (x)=>new FatalError(x,'ожидался квантификатор');
exports.err_quant = err_quant;
/* var reg_quantifier = any(collect,
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
*/
var quantifier = any(collect,
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
//exports.quantifier = quantifier;
test.add_test('/','quantifier',(path)=>{
	describe('quantifier ::= [`*+?`] | `{`$spcs(`,`$spcs$num|$num($spcs`,`$spcs$num?)?)$spcs`}`\
 (?#пока только энергичные)',()=>{
		it_compile('+'		,{min:1,max:Infinity}	,compile(quantifier))
		it_compile('{3,5}'	,{min:3,max:5}			,compile(quantifier))
		it_compile('{3}'	,{min:3,max:3}			,compile(quantifier))
		it_compile('{3,}'	,{min:3,max:Infinity}	,compile(quantifier))
		it_compile('{,3}'	,{min:0,max:3}			,compile(quantifier))
		it_compile('{ 3 , 5 }',{min:3,max:5}		,compile(quantifier))
	})
})
//}
// ================================================================================================
/* string object modifier fake-modifier
string ::= `'` ([^'\\]|\\'|\\\\)* `'` | `"` ([^"\\]|\\"|\\\\)* `"`;
object ::= `{` ([^'"\{\}] | $string | $object)* `}`;
pre_code ::= (\`[^\`]*\`|$object) (`error`|`?`)? `<` (?#обработчик)
(?#`error` - обработчик ошибки)
(?#`?` - значение по умолчанию: ?`smth`?< эквивалентно ?`arg.length==1?arg[0]:smth`<);
code ::= $pre_code (?# строка превращается в функцию)
modifier ::= `?`
(	`!` (?#отрицание)
|	$code
|	$identifier`->` (?#back_pattern)
|	$identifier?`=` (?#имя последовательности)
|	`toString:` (?#директива, преобразующая объектную последовательность в строковую)
);
fake_modifier ::= `?`
(	`!`
|	(\`[^\`]*\`|$object) (`error`|`?`)? `<`
|	$identifier`->`
|	$identifier?`=`
|	`toString:`
);

#todo
back_pattern - создает предложение с именем, равным заданному идентификатору, 
и паттерном, равному результату этой группы (его можно указывать только в конкатенирующих группах).
После чего, на такое предложение можно ссылаться обычным образом $id.
При добавлении предложений идет проверка, чтоб их имена были разными.
В этот же момент идет такое же добавление back_pattern-ов с такой же проверкой, 
	и назначением значения, равного undefined;
Если во время выполнения $id ссылается на паттерн со значением undefined, то происходит ошибка.


обработчики все имеют аргументы (arg, pos), 
в качестве this - global_modifier_object - todo: сделать для каждого объекта свой
error - означает, что обработчик вызовется для ошибки, и сможет изменить сообщение об ощибке.
возвращаемое значение является результатом или сообщением об ошибке.
кинутые исключения - записываются в modifier_throws и error_modifier_throws
	todo: сделать для каждого объекта свой
	а результат становится undefined, а если это обработка ошибки, то она не меняется
*/
//{
// string ::= `'` ([^'\\]|\\'|\\\\)* `'` | `"` ([^"\\]|\\"|\\\\)* `"`;
var err_string = (x)=>new FatalError(x,'не могу прочитать строку js');
exports.err_string = err_string;
var string = any(collect,
	rgx(/^'([^'\\]|\\'|\\\\)*'/).then(m=>m[0]),
	rgx(/^"([^"\\]|\\"|\\\\)*"/).then(m=>m[0])
).then(0, err_string);
//exports.string = string;
test.add_test('/','string',(path)=>{
	describe('string ::=\
`"`([^\\"\\\\]|`\\\\\\"`|`\\\\\\\\`)*`"`|`\'`([^\\\'\\\\]|`\\\\\\\'`|`\\\\\\\\`)*`\'`\
(?#возвращает вместе с кавычками)',()=>{
		it_compile('"{{{}{}}}}}}{}{}}{"','"{{{}{}}}}}}{}{}}{"',compile(string))
	})
})

// object ::= `{` ([^'"\{\}] | $string | $object)* `}`;
var err_obj = (x)=>new FatalError(x,'не могу прочитать объект js');
exports.err_obj = err_obj;
var object = new Forward();
object.pattern = seq( need_all, txt('{'),
	rep(any(collect,
		rgx(/^[^'"\{\}]/).then(m=>m[0]),
		string,
		object
	),star).then(merger),
	txt('}')
).then(merger,err_obj);
//exports.object = object;
test.add_test('/','object',(path)=>{
	describe('object ::= `{`([^\\\'\\"\\{\\}]|string|object)*`}`\
(?#возвращает ввиде неразобранной строки)',()=>{
		it_compile(
			'{x1:"hello world",x2:{complicated:"{{{}{}}}}}}{}{}}{"}}',
			'{x1:"hello world",x2:{complicated:"{{{}{}}}}}}{}{}}{"}}',compile(object))
	})
})

// pre_code ::= (\`[^\`]*\`|$object) (`error`|`?`)? `<` (?#обработчик)
// (?#`error` - обработчик ошибки)
// (?#`?` - значение по умолчанию: ?`smth`?< эквивалентно ?`arg.length==1?arg[0]:smth`<);
var pre_code = seq(need(0,1),
	any(collect,
		seq(need(1),txt('`'),
			rgx(/^[^`]*/).then(m=>{
				if(/^\s*\{/.test(m[0]) && /\}\s*$/.test(m[0]))
					return {type:'code',data:m[0]}
				else
					return {type:'expr',data:m[0]}
			}),
			txt('`')),
		object.then(s=>({type:'obj',data:s}))
	),
	opt(any(collect,txt('error'),txt('?')),''),
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
//exports.pre_code = pre_code;
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
var global_modifier_object = {}; 
	// todo пока глобальный, но потом будет инициализироваться перед парсингом паттерна
var code = pre_code.then((m,x)=>{ 
	try {
		m.data = (new Function('arg','pos',m.data)).bind(global_modifier_object); 
	}
	catch(err) {
		return new ParseError(x,'синтаксическая ошибка в обработчике',err);
	}
	return m
})
test.add_test('/','code',(path)=>{
	describe('code ::= $pre_code (?# строка превращается в функцию)\
 (?#возвращает, как и pre_code,\
 {type:"postscript",data:function(arg,pos){...}/"code",error:true/false})',()=>{
		function it_compile_fun(pattern,obj,arg,res,comment='') {
			it(comment+'"'+pattern+'" ---> '+JSON.stringify(obj)+'   |.data(): '+
				JSON.stringify(arg)+' --> '+JSON.stringify(res),
				()=>{
					var prpat = code.exec(pattern); // prepared pattern
					assertPrepareDeepEqual(prpat,obj);
					assertPrepareDeepEqual(prpat.data(arg),res);
				}
			);
		}
		it_compile_fun('`"hello world"`error<',
			{type:"postscript",data:function(arg,pos){ return "hello world";},error:true},
			'',"hello world",'обработчик ошибки: ')
		it_compile_fun('`"hello world"`<',
			{type:"postscript",data:function(arg,pos){ return "hello world";},error:false},
			'',"hello world",'если в `` нет {}, то это помещается в {return ...}')
		it_compile_fun('`{return "hello world"}`<',
			{type:"postscript",data:function(arg,pos){ return "hello world";},error:false},
			'',"hello world",'если в `` есть {}, то оно остается неизменным')
		it_err_compile('`{return return}`<',()=>new ParseError(0,
				"синтаксическая ошибка в обработчике",
				new SyntaxError("Unexpected token return")
			),compile(code),'синтаксическая ошибка в обработчике: '
		)
		describe('complicated object',()=>{
			it_compile_fun('{x1:"hello world",x2:{complicated:"{{{}{}}}}}}{}{}}{"}}<',
				{	type:"postscript",
					data:function(arg,pos){
						return {x1:"hello world",x2:{complicated:"{{{}{}}}}}}{}{}}{"}}
					},
					error:false
				},
				'',{x1:"hello world",x2:{complicated:"{{{}{}}}}}}{}{}}{"}}
			)
			it_compile_fun('{x1:"hello world",x2:{complicated:"{{{}{}}}}}}{}{}}{"}}error<',
				{	type:"postscript",
					data:function(arg,pos){
						return {x1:"hello world",x2:{complicated:"{{{}{}}}}}}{}{}}{"}}
					},
					error:true
				},
				'',{x1:"hello world",x2:{complicated:"{{{}{}}}}}}{}{}}{"}}
			)
			it_compile_fun('`"hello world"`?<',
				{type:"postscript",data:function(arg,pos){ return arg.length==1?arg[0]:"hello world";},error:false},
				[],"hello world")
		})
	})
})

/*
modifier ::= `?`
(	`!` (?#отрицание)
|	$code
|	$identifier`->` (?#back_pattern)
|	$identifier?`=` (?#имя последовательности)
|	`toString:` (?#директива, преобразующая объектную последовательность в строковую)
);
*/
var modifier = seq(need(1), txt('?'), any(collect,
	txt('!').then(r=>({type:'not'})),
	code,
	seq(need(0),identifier,txt('->')).then(s=>({type:'back_pattern',data:s})),   // на будущее
	seq(need(0),opt(identifier,''),txt('=')).then(s=>({type:'returnname',data:s})),
	txt('toString:').then(s=>({type:'toString'}))
)).then(0,(x,e)=>err_in(x,'modifier',e));
//exports.modifier = modifier;
var fake_modifier = seq(need_none, txt('?'), any(collect,
	txt('!'),
	seq(need_none,
		any(collect,
			seq(need_none,txt('`'),
				rgx(/^[^`]*/),
				txt('`')),
			object
		),
		opt(any(collect,txt('error'),txt('?')),''),
		txt('<')
	),
	seq(need_none,identifier,txt('->')),   // на будущее
	seq(need_none,opt(identifier,''),txt('=')),
	txt('toString:')
)).then(0,(x,e)=>err_in(x,'fake_modifier',e));
//exports.fake_modifier = fake_modifier;
test.add_test('/','modifier',(path)=>{
	describe('modifier ::= `?` (`!` | $code | $identifier`->` |	$identifier?`=` | `toString:` );'
	,()=>{
		describe('(?#отрицание) `!` (?# при удачном прочтении этой скобочной группы возвращается ошибка, а при неудачном - {err:"continue"} - чтобы если такой результат получит $alternatives, то он продолжил перебирать альтернативы, но если удачных альтернатив больше нет, а некоторый результат уже есть, то он будет возвращен. а $sequence считает, как будто это пустая строка)',()=>{
			it_compile('?!',{type:"not"},compile(modifier))
		})
		describe('$code (?# просто обрабатывает результат или ошибку)',()=>{
			it_compile('?`"hello world"`<',
				{type:"postscript",data:function(arg,pos){ return 'hello world'},error:false},
				compile(modifier))
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
//}
// ================================================================================================
/* (fake-)reg/bnf-sequence (fake-)reg/bnf-alternatives comment
comment ::= `(?#` ($fake_modifier*     `*`)? $fake_reg_alternatives       `)` $quantifier?
reg_sequence ::= $modifier* ($link |
(	    $reg_symbol $quantifier?
| 	`(`   (     $modifier*        `*`)?           $reg_alternatives       `)` $quantifier?
|	$comment
)*);
fake_reg_sequence ::= $fake_modifier* ($link |
(	    $reg_symbol $quantifier? (?#пробелы в reg_class и quantifier допустимы)
| 	`(`   ($fake_modifier*        `*`)?      $fake_reg_alternatives       `)` $quantifier?
|	$comment
)*);
bnf_sequence ::= $modifier* ($spcs $link |
($spcs(	$bnf_symbol $quantifier?
| 	`(`   (     $modifier* $spcs  `*`)? $spcs     $bnf_alternatives $spcs `)` $quantifier?
|	$comment
))*);
reg_alternatives      ::= $reg_sequence      (      `|`$reg_sequence     )*;
fake_reg_alternatives ::= $fake_reg_sequence (      `|`$fake_reg_sequence)*;
bnf_alternatives      ::= $bnf_sequence      ($spcs `|`$bnf_sequence     )*;
*/
//{
var reg_alternatives = new Forward();
var bnf_alternatives = new Forward();
var fake_reg_alternatives = new Forward;
// comment ::= `(?#` ($fake_modifier*     `*`)? $fake_reg_alternatives       `)` $quantifier?
var comment = seq(need_none,
	txt('(?#'),	opt(seq(need_none,rep(fake_modifier),txt('*'))),fake_reg_alternatives,txt(')'),
	opt(quantifier)
).then(0,(x,e)=>err_in(x,'comment',e));


var pos_adder = (m,x)=>{m.pos = x; return m;};
var err_seq_c_modifiers = x=>new PaarseError(x,'модификаторы цикла можно задавать только к циклу');
var err_reg_sequence = (x,e)=>new FatalError(x,'не могу прочитать reg_sequence',e);
exports.err_reg_sequence = err_reg_sequence;
/*
reg_sequence ::= $modifier* ($link |
(	    $reg_symbol $quantifier?
| 	`(`   (     $modifier*        `*`)?           $reg_alternatives       `)` $quantifier?
|	$comment
)*);
*/
var reg_sequence = seq(need_all,
	rep(modifier.then(pos_adder)), // модификаторы
	any(collect,
		link.then((s,x)=>({type:'link',link:s,pos:x})),
		rep(any(collect, // паттерны
			seq(need_all,
				reg_symbol,
				opt(quantifier,null)
			).then(([symbol,quant],x)=>({type:'symbol',symbol,quant,pos:x})),
			seq(need(1,2,4),
				txt('('),
				opt(seq(need(0),rep(modifier.then(pos_adder)),txt('*')),[]),
				reg_alternatives,
				txt(')'),
				opt(quantifier,null)
			).then(([cycle_modifiers,{mode,fun,direct},quant],x)=>
				quant ? {type:'cycle',quant,cycle_modifiers,mode,fun,direct,pos:x} :
				cycle_modifiers.length>0 ? err_seq_c_modifiers(x) :
				{type:'pattern',mode,fun,direct,pos:x}),
			comment.then(pos_adder)
		))
	)
).then(sequence_compiler,err_reg_sequence);
exports.reg_sequence = reg_sequence;
var err_fail_not = (x,name)=> new FatalError(x,'удалось прочитать то, что не должно быть прочитано: '+name)
exports.err_fail_not = err_fail_not;
/*
fake_reg_sequence ::= $fake_modifier* ($link |
(	    $reg_symbol $quantifier? (?#пробелы в reg_class и quantifier допустимы)
| 	`(`   ($fake_modifier*        `*`)?      $fake_reg_alternatives       `)` $quantifier?
|	$comment
)*);
*/
var fake_reg_sequence = seq(need_all,
	rep(fake_modifier), // модификаторы
	any(collect,
		link,
		rep(any(collect, // паттерны
			seq(need_all,
				reg_symbol,
				opt(quantifier,null)
			).then(([symbol,quant],x)=>({type:'symbol',symbol,quant,pos:x})),
			seq(need(1,2,4),
				txt('('),
				opt(seq(need(0),rep(fake_modifier.then(pos_adder)),txt('*')),[]),
				fake_reg_alternatives,
				txt(')'),
				opt(quantifier,null)
			).then(([cycle_modifiers,{mode,fun,direct},quant],x)=>
				quant ? {type:'cycle',quant,cycle_modifiers,mode,fun,direct,pos:x} :
				cycle_modifiers.length>0 ? err_seq_c_modifiers(x) :
				{type:'pattern',mode,fun,direct,pos:x}),
			comment.then(pos_adder)
		))
	)
).then(0,err_reg_sequence);
//exports.fake_reg_sequence = fake_reg_sequence;
/*
bnf_sequence ::= $modifier* ($spcs $link |
($spcs(	$bnf_symbol $quantifier?
| 	`(`   (     $modifier* $spcs  `*`)? $spcs     $bnf_alternatives $spcs `)` $quantifier?
|	$comment
))*);
*/
var bnf_sequence = seq(need_all,
	rep(modifier.then(pos_adder)), // модификаторы
	any(collect,
		seq(need(1),spcs,link.then((s,x)=>({type:'link',link:s,pos:x}))),
		rep(seq(need(1),spcs,any(collect, // паттерны
			seq(need_all,
				bnf_symbol,
				opt(quantifier,null)
			).then(([symbol,quant],x)=>({type:'symbol',symbol,quant,pos:x})),
			seq(need(1,3,6),
				txt('('),
				opt(seq(need(0),rep(modifier.then(pos_adder)),spcs,txt('*')),[]),
				spcs,
				bnf_alternatives,
				spcs,
				txt(')'),
				opt(quantifier,null)
			).then(([cycle_modifiers,{mode,fun,direct},quant],x)=>
				quant ? {type:'cycle',quant,cycle_modifiers,mode,fun,direct,pos:x} :
				cycle_modifiers.length>0 ? err_seq_c_modifiers(x) :
				{type:'pattern',mode,fun,direct,pos:x}),
			comment.then(pos_adder)
		)))
	)
).then(sequence_compiler,err_reg_sequence);
//exports.bnf_sequence = bnf_sequence;
// reg_alternatives      ::= $reg_sequence      (      `|`$reg_sequence     )*;
reg_alternatives.pattern = seq(need_all,reg_sequence,rep(seq(need(1),txt('|'),reg_sequence)))
.then(alternatives_compiler);
// fake_reg_alternatives ::= $fake_reg_sequence (      `|`$fake_reg_sequence)*;
fake_reg_alternatives.pattern = seq(need_none,fake_reg_sequence,rep(seq(need_none,txt('|'),fake_reg_sequence)));
// bnf_alternatives      ::= $bnf_sequence      ($spcs `|`$bnf_sequence     )*;
bnf_alternatives.pattern = seq(need_all,bnf_sequence,rep(seq(need(2),spcs,txt('|'),bnf_sequence)))
.then(alternatives_compiler);
test.add_test('/','seqaltcom',()=>{
	// todo тестирование синтаксиса (fake-)reg/bnf-sequence (fake-)reg/bnf-alternatives comment
})

//}
// ================================================================================================
/* группы пока только энергичные, без возвратов, как будто (?>...)
a(?>bc|b|x)cc 
	abcc fail
	axcc OK
// обычным группам будет синтаксис ((нанана))
отличия от обычных regexp-ов:
рекурсивные - можно вызывать один паттерн из другого (есть в perl)
группы надо именовать вручную
результат группы можно обработать прям сразу
по умолчанию результат возвращается в JSON
*/
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
		и всегда возвращает в случае НЕудачного завершения
			пустую строку в качестве результата
			и {err:'continue'} вместо true в качестве ошибки, т.е. удачности результата
	фунякция является объектной, если хотябы одна из функций, которую она вызывает, 
		имеет тип obj, иначе функция является конкатенирующей
	но если последовательность состоит только из вызова ссылки на паттерн, 
		и при этом указано (возможно пустое) имя
		то последовательность все равно является объектной

	объектная функция* может иметь обработчики только если имеет (возможно пустое) имя

	функции*, у которых задано пустое имя имеют атрибут direct
	перечисление имеет атрибут direct, если хотябы одна из альтернатив имеет атрибут direct
	если функция* вызывает хотябы одну функцию, которая direct
		то она обязана иметь (возможно пустое) имя
	если цикл является объектным, он обязан иметь (возможно пустое) имя #todo: или атрибут toString
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
//{
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

var err_uncycle = (x,i,name)=>new FatalError(x,'защита от зацикливания '+name+': на итерации '+i+' было прочитано 0 символов');
var perr_c_name = x=>new ParseError(x,'объектный цикл должен иметь (возможно пустое) имя')
var perr_dublicate = (x,name)=>new ParseError(x,'повторно указано: '+name);
var perr_cycle_bp = x=>new ParseError(x,'цикл не может содержать back_pattern');

function sequence_compiler([modifiers,patterns],pattern_x){
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
		return !isGood(r) ? /*OK,but*/{err:"continue"} : err_fail_not(x,name); // всегда попадет в alternatives
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
}

function alternatives_compiler([head,tail]){
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
		группы пока только энергичные, без возвратов, как будто (?>...)
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
	var alt = parse(reg_alternatives)
	var err_alt = err_parse(reg_alternatives)
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
			it_err_parse('a(x)+b','ab',()=>err_rgx(1,/x/.source),err_alt)
			it_parse('a(x)+b','axb','axb',alt)
			it_parse('a(x)+b','axxxxb','axxxxb',alt)
			it_parse('a(x)?b','ab','ab',alt)
			it_parse('a(x)?b','axb','axb',alt)
			it_err_parse('a(x)?b','axxxxb',()=>err_rgx(2,/b/.source),err_alt)
			it_err_parse('a(x){7,9}b','ab',()=>err_rgx(1,/x/.source),err_alt)
			it_err_parse('a(x){7,9}b','axb',()=>err_rgx(2,/x/.source),err_alt)
			it_parse('a(x){7,9}b','axxxxxxxxb','axxxxxxxxb',alt)
			it_err_parse('a(x){7,9}b','axxxxxxxxxxb',()=>err_rgx(10,/b/.source),err_alt)
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
			it_err_parse('a|b|c','d',()=>err_filtered(0,[
				err_rgx(0,/a/.source),
				err_rgx(0,/b/.source),
				err_rgx(0,/c/.source),
				]),err_alt)
			describe('в последовательностях',()=>{
				it_err_parse('x(a|b|c)y','xy',()=>err_filtered(1,[
					err_rgx(1,/a/.source),
					err_rgx(1,/b/.source),
					err_rgx(1,/c/.source),
					]),err_alt)
				it_parse('x(a|b|c)y','xay','xay',alt)
				it_parse('x(a|b|c)y','xby','xby',alt)
				it_parse('x(a|b|c)y','xcy','xcy',alt)
				it_err_parse('x(a|b|c)y','xdy',()=>err_filtered(1,[
					err_rgx(1,/a/.source),
					err_rgx(1,/b/.source),
					err_rgx(1,/c/.source),
					]),err_alt)
			})
			describe('в циклах',()=>{
				it_parse('x(a|b|c)*y','xy','xy',alt)
				it_parse('x(a|b|c)*y','xaby','xaby',alt)
				it_parse('x(a|b|c)*y','xbcy','xbcy',alt)
				it_err_parse('x(a|b|c)*y','xcdy',()=>err_rgx(2,/y/.source),err_alt)
				it_err_parse('x(a|b|c)*y','xdy',()=>err_rgx(1,/y/.source),err_alt)
			})
			describe('группы пока только энергичные, без возвратов, как будто (?>...)',()=>{
				it_err_parse('a(bc|b|x)cc','abcc',()=>err_rgx(3,/cc/.source),err_alt)
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
			it_err_parse('ab(?!x)cd','abycd',()=>err_rgx(2,/cd/.source),err_alt)
			it_parse('a|?!x|b','a','a',alt)
			it_err_parse('a|?!x|b','x',()=>err_filtered(0,[
				err_rgx(0,/a/.source),
				err_fail_not(0,'безымянная последовательность')
				]),err_alt)
			it_parse('a|?!x|b','b','b',alt)
			it_err_parse('a|?!x|x','x',()=>err_filtered(0,[
				err_rgx(0,/a/.source),
				err_fail_not(0,'безымянная последовательность')
				]),err_alt)
			it_parse('a|x|?!x','x','x',alt)
			it_err_parse('k(a|?!x|b)l','kxl',()=>err_filtered(1,[
				err_rgx(1,/a/.source),
				err_fail_not(1,'безымянная последовательность')
				]),err_alt)
			it_parse('k|(a|?!x|b)|x','x','x',alt)
			it_parse('k|(?!x)|x','x','x',alt)
/*			it_err_parse('k|(?!y)|z','x',()=>err_filtered(1,[
				err_rgx(1,/a/.source),
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
				то результатом этой последовательности будет именно объект
				и такая последовательность скопирует все свойства этого объекта в предоставленный родительской функцией объект (и по этому обработчики запрещены, т.к. они могут возвратить и не объект)
				?n1=(?`7`<q(?n2=w)e)(?n3=(?n4=r)t(?n5=y))u(?n6=iop) ошибка
	циклы
		ab(?n=*x|y|z)*cd
			zbxyxyxzcd	{n:['x','y','x','y','x','z']}
		ab(?=*x|y|z)*cd
			zbxyxyxzcd	['x','y','x','y','x','z']
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
					qwwwwe	wwww
		непрерывность (ошибка компиляции)
			?= означает, что промежуточный результат родительской функции нужно заменить полученным результатом (и он может быть не обязательно объектом)
				q(?n1=(w(?=e)r|?=tyu))i ошибка
			ну и еще для удобочитаемости
				qw((?n1=er)(?n2=ty))*ui	ошибка
				?=*qw(?=*(?n1=er)(?n2=ty))*ui
					qwertyertyui	[{n1:'er',n2:'ty'},{n1:'er',n2:'ty'}]
*/
test.add_test('/','obj_toString',(path)=>{
	var alt = parse(reg_alternatives)
	var err_alt = err_parse(reg_alternatives)
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
				то результатом этой последовательности будет именно объект
				и такая последовательность скопирует все свойства этого объекта в предоставленный родительской функцией объект (и по этому обработчики запрещены, т.к. они могут возвратить и не объект)
				?n1=(?`7`<q(?n2=w)e)(?n3=(?n4=r)t(?n5=y))u(?n6=iop) ошибка
*/
			describe('глубиной 1',()=>{
				it_parse('?name=xy','xy',{name:'xy'},alt,"напрямую: ");
				it_parse('ab(?name=xy)cd','abxycd',{name:'xy'},alt,"через неименованную вложенность: ");
				it_parse('q(?toString:ab(?name=xy)cd)w','qabcdw',
					'q{"name":"xy"}w',alt,"напрямую: ");
			})
		})
	})
})
			var inres = {res:{}};
			var funobj = reg_alternatives.exec('q(?toString:ab(?name=xy)cd)w');
			if(!funobj.fun)
				throw new Error('compile error: '+JSON.stringify(funobj,'',4))
			var err = funobj.fun('qabcdw',{x:0},inres);
			assertDeepEqual(err,true);
			assertDeepEqual(inres.res,'q{"name":"xy"}w');

//}
// ===============================================================================================
/* expr main
expr ::= $spcs $identifier $spcs (`:=`$reg_alternatives | `::=` $spcs $bnf_alternatives $spcs );
main ::= $expr(`;` $comment? $expr)* `;`? ;
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
