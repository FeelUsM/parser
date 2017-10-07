;(function(){
function main(module, exports, require) {
"use strict";

var test = require('parser_test_utils');

//{ ==== обычные токены ====
test.add_category('/','simpleTokens','');
test.add_test('/simpleTokens','spcs',(path)=>{
	describe('spcs:=$spc*;   spc :=[\ \\r\\n\\t\\v\\f]|`(|`(?!`|)`|.)*`|)`|`||`[^\\r\\n\\v\\f]*[\\r\\n\\v\\f];',()=>{
		it_compile(''                ,'',compile(spcs))
		it_compile('    '            ,'',compile(spcs))
		it_compile('||stdgdy\n'	     ,'',compile(spcs))
		it_compile(' (|dtydydyf|) '  ,'',compile(spcs))
		//it_err_compile(""	,()=>err_qseq(0),compile(spcs))
	})
});
//}
//{ ==== токены символов ====
test.add_category('/','symbolTokens','');
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
test.add_test('/symbolTokens','reg_char',(path)=>{
	describe('reg_char ::='+/[^\\\/\``;|$.*+?()[]{}`] | \\./.source+'; || возвращает символ;  здесь перечислены управляющие символы, остальные символы считаются обычными',()=>{
		it_compile(		'1'		,'1'			,compile(reg_char))
		it_err_compile(	'$'		,()=>err_char(0),compile(reg_char))
		it_compile(		'\\$'	,'$'			,compile(reg_char))
		it_err_compile(	""		,()=>err_char(0),compile(reg_char))
	})
})
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
test.add_test('/symbolTokens','bnf_class',(path)=>{
	describe('bnf_class ::= `.` | `[``^`? spcs (bnf_classChar(`-`bnf_classChar)? spcs \
|quotedSequence spcs)*`]`; || возвращает регексп (без галки вначале)',()=>{
		it_compile('[ \\a \\b \\c ]',/[abc]/,compile(bnf_class))
	});
})
//}
//{ ==== другие токены: квантификаторы, модификаторы, обработчики ====
test.add_category('/','otherTokens','');
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
test.add_test('/otherTokens','handler',(path)=>{
	var fake_handler_schema = {
		type: "object",
		requredProperties: {
			error: { type: "boolean" },
			code: { type: "string" }
		}
	}
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
		direct: {/*...*/},
		used_links: {
			type:"object",
			patternProperties:"[a-zA-Z_][a-zA-Z0-9_]*"
		}
	},
	additionalProperties:{
		not: { type:"bool"}
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
					()=>err_in(0,'sequence',perr_obj_handlers(16)),comp_alt)
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


} // function main
	try{
		if(loaded_modules) { // it is not node.js
			module = new Module();
			main(module, module.exports, require);
			loaded_modules["parser_test"] = module.exports; 
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
