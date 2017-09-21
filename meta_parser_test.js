;(function(){
function main(module, exports, require) {
"use strict";

var test = require('parser_test_utils');
test.add_category('/','meta_parser','');

//{ === ошибки ===
test.add_test('/meta_parser','isGood(){ return (typeof r === "object" && r!==null) ? r.err!="parse" && r.err!="fatal" : r!==undefined ; }',(path)=>{
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

test.add_test('/meta_parser',"notFatal(r){ return (typeof r === 'object' && r!==null) ? r.err!='fatal' : r!==undefined ; } ",(path)=>{
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
//{ === SEQ ===
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
} // function main
	try{
		if(loaded_modules) { // it is not node.js
			module = new Module();
			main(module, module.exports, require);
			loaded_modules["meta_parser_test"] = module.exports; 
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
