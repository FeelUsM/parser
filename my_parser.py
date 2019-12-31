class obj:
	def __init__(self,**kvargs):
		self.__keys = []
		for k,v in kvargs.items():
			setattr(self,k,v)
			self.__keys.append(k)
	def __repr__(self):
		s = 'obj('
		for name in self.__keys:
			#if not name.startswith('__'):
			s+=name+'='+str(getattr(self,name))+','
		return s+')'
	
class FatalError():
	def __init__(self,mes=''):
		self.mes = mes
	def __repr__(self):
		return 'FatalError('+repr(self.mes)+')'
def is_fatal(x):
	if x==FatalError: raise BaseException(FatalError)
	return type(x)==FatalError

import sys

# spc :=[\ \r\n\t\v\f]|`(|`(?!`|)`|.)*`|)`|`||`[^\r\n\v\f]*[\r\n\v\f];
"""возвращает пробел"""
#   todo комментарии не реализованы
# spcs:=$spc*;
"""возвращает пробел"""
# num :=[0-9]+;
"""возвращает число"""
# identifier :=[a-zA-Z_][a-zA-Z_0-9]*;
"""возвращает строку"""
# quoted_sequence ::=\` ( [^\`\\] | \\\` | \\\\)* \` ;
"""возвращает строку"""
#   todo сделать обычные кавычки для bnf
# reg_char :=[^\\\/\``;|$.*+?()[]{}`]|\\.;
#  || здесь перечислены управляющие символы, остальные символы считаются обычными
#  || ^-\/`;|$.*+?()[]{}
"""возвращает символ"""
# bnf_char :=\\.;
#  || любые символы считаются управляющими, обычные символы надо брать в кавычки или экранировать
#  а управляющие символы сначала надо брать в кавычки а потом еще и экранировать внутри кавычек
"""возвращает символ"""
# reg_class_char ::= [^\\\/\``^-;|$.*+?()[]{}`] | `\\`.;
#  || к управляющим символам добавляется `^-`, пробелы разрешены
"""возвращает символ"""
# bnf_class_char ::= [^\\\/\``^-;|$.*+?()[]{} `]| `\\`.;
#  || к управляющим символам добавляется `^-`, пробелы запрещены
"""возвращает символ"""
# reg_class ::= `.` | `[``^`?  (reg_classChar(`-`reg_classChar)?   |quotedSequence     )*`]` 
#  / *=>new RegExp(arg)* /;
"""возвращает pp_функцию"""
# bnf_class ::= `.` | `[``^`? spcs 
#    (bnf_classChar(`-`bnf_classChar)? spcs |quotedSequence spcs)*`]` 
#  / *=>new RegExp(arg)* /;
"""возвращает pp_функцию"""
# name_modifier ::= `?` identifier? `=`  || имя последовательности - имя результата
"""возвращет строку"""
# seq_handler ::= `/*`(?!`*/`|.)*`*/`
"""возвращает функцию-обработчик"""
# alt_handler ::= `//`(?!`*/`|.)*`*/`
"""возвращает функцию-обработчик"""
# simple_quantifier ::= [`*+?`]
"""возвращает объект {min:int, max:int, name:..., seq_handler:..., alt_handler:...}"""
# complex_quantifier ::=  `{`spcs 
#    (name_modifier spcs)? 
#    ([`*+?`] |`,` spcs num | num (spcs `,` spcs num?)? ) spcs 
#    (seq_handler spcs)?
#    `}` ;
"""возвращает объект {min:int, max:int, name:..., seq_handler:..., alt_handler:...}"""
#-----
# reg_str_link ::= `$`  ( ?id=identifier ) /*=>{link:arg.id}* /;
"""возвращет пару (тип, pp_функция)"""
# reg_bnf_link ::= {?}`$`  ( ?id=identifier ) /*=>{link:arg.id}* /;
"""возвращет пару (тип, pp_функция)"""
# obj_direct_link ::= `$` ('(' $identifier ')'
#                          | '{' $identifier {?}([=:] $identifier)'}');
"""возвращет пару (тип, pp_функция)"""
# reg_symbol ::= reg_char|quoted_sequence|reg_class|reg_str_link|obj_direct_link;
"""возвращет пару (тип, pp_функция)"""
# bnf_symbol ::= bnf_char|quoted_sequence|bnf_class|bnf_str_link|obj_direct_link;
"""возвращет пару (тип, pp_функция)"""
# reg_sequence ::=
#    name_modifier?
#    ( ( reg_symbol | `(` reg_alternatives`)` )
#       quantifier?
#    )+
#    (seq_handler spcs)?;
"""возвращет пару (тип, pp_функция)"""
# bnf_sequence_ ::=
#    (name_modifier spcs)?
#    ( (complex_quantifier spcs)?
#      ( bnf_symbol spcs | `(` bnf_alternatives`)` spcs )
#      (cimple_quantifier spcs)?
#    )+
#    (seq_handler spcs)?;
"""возвращет пару (тип, pp_функция)"""
# reg_alternatives ::= reg_sequence (`|` reg_sequence)*  alt_handler?
"""возвращет пару (тип, pp_функция)"""
# bnf_alternatives_ ::= bnf_sequence_ (`|` spcs bnf_sequence_)*  (alt_handler spcs)?
"""возвращет пару (тип, pp_функция)"""

	
#=== Свободные паттерны ===

# spc :=[\ \r\n\t\v\f]|`(|`(?!`|)`|.)*`|)`|`||`[^\r\n\v\f]*[\r\n\v\f];
# комментарии потом реализуем, если понадобится
def p_spc(s,p):
	"""возвращает пробел"""
	#print(p)
	if p<len(s) and s[p] in ' \r\n\t\v\f':
		return (p+1,s[p])
	# потом доделать комментарии
	return (p,FatalError('ожидался пробел'))
	
# spcs:=$spc*;
def p_spcs(s,p):
	"""возвращает пробел"""
	while True:
		old_p = p
		p,r = p_spc(s,p)
		if is_fatal(r):
			return (old_p,' ')
			
# num :=[0-9]+;
def p_num(s,p):
	"""возвращает число"""
	start = p
	if p<len(s) and s[p]in'0123456789':
		p+=1
	else: return (p,FatalError('ожидалось число'))
	while p<len(s) and s[p]in'0123456789':
		p+=1
	return (p,int(s[start:p]))
	
# identifier :=[a-zA-Z_][a-zA-Z_0-9]*;
def p_identifier(s,p):
	"""возвращает строку"""
	start = p
	if p<len(s) and (s[p]>='a' and s[p]<='z' or s[p]>='A' and s[p]<='Z'):
		p+=1
	else: return (p,FatalError('ожидался идентификатор'))
	while p<len(s) \
		and (s[p]in'0123456789' or s[p]>='a' and s[p]<='z' or s[p]>='A' and s[p]<='Z'):
		p+=1
	return (p,str(s[start:p])) 
	
# quoted_sequence ::=\` ( [^\`\\] | \\\` | \\\\)* \` ;
def p_quoted_sequence(s,p):
	"""возвращает строку"""
	if p<len(s) and s[p]=='`':
		p+=1
	else: return (p,FatalError('ожидалась строка в обратных кавычках'))
	rs = ''
	while p<len(s) and s[p]!='`':
		if s[p]=='\\':
			p+=1
			if not p<len(s): return (p,FatalError())
			if s[p]=='\\': rs+='\\'
			elif s[p]=='`': rs+='`'
			elif s[p]=='r': rs+='\r'
			elif s[p]=='n': rs+='\n'
			elif s[p]=='t': rs+='\t'
			elif s[p]=='v': rs+='\v'
			elif s[p]=='f': rs+='\f'
			elif s[p]=='\n': pass
			else:
				print('at position',p,'found unexpected escape sequence \\'+s[p],file=sys.err)
				rs+='\\'+s[p]
			p+=1
		else:
			rs+=s[p]
			p+=1
	if p<len(s) and s[p]=='`':
		p+=1
		return (p,rs)
	else: return (p,FatalError('неожиданный конец файла внутри строкового литерала'))

# reg_char :=[^\\\/\``;|$.*+?()[]{}`]|\\.;
#  || здесь перечислены управляющие символы, остальные символы считаются обычными
#  || ^-\/`;|$.*+?()[]{}
def p_reg_char(s,p):
	"""возвращает символ"""
	if p<len(s) and s[p]=='\\':
		p+=1
		if p<len(s):
			return (p+1,s[p])
		else: return (p,FatalError('неожиданный конец файла'))
	elif p<len(s) and s[p] not in r'\/`;|$.*+?()[]{}':
		return (p+1,s[p])
	else: return (p,FatalError('ожидался reg_cahr'))
	
# bnf_char :=\\.;
#  || любые символы считаются управляющими, обычные символы надо брать в кавычки или экранировать
#  а управляющие символы сначала надо брать в кавычки а потом еще и экранировать внутри кавычек
def p_bnf_char(s,p):
	"""возвращает символ"""
	if p<len(s) and s[p]=='\\':
		p+=1
		if p<len(s):
			return (p+1,s[p])
		else: return (p,FatalError('неожиданный конец файла'))
	else: return (p,FatalError('ожидался bnf_char'))
	
# reg_class_char ::= [^\\\/\``^-;|$.*+?()[]{}`] | `\\`.;
#  || к управляющим символам добавляется `^-`, пробелы разрешены
def p_reg_class_char(s,p):
	"""возвращает символ"""
	if p<len(s) and s[p]=='\\':
		p+=1
		if p<len(s):
			return (p+1,s[p])
		else: return (p,FatalError('неожиданный конец файла'))
	elif p<len(s) and s[p] not in r'\/`;|$.*+?()[]{}^-':
		return (p+1,s[p])
	else: return (p,FatalError('ожидался reg_class_char'))
	
# bnf_class_char ::= [^\\\/\``^-;|$.*+?()[]{} `]| `\\`.;
#  || к управляющим символам добавляется `^-`, пробелы запрещены
def p_bnf_class_char(s,p):
	"""возвращает символ"""
	if p<len(s) and s[p]=='\\':
		p+=1
		if p<len(s):
			return (p+1,s[p])
		else: return (p,FatalError('неожиданный конец файла'))
	elif p<len(s) and s[p] not in r'\/`;|$.*+?()[]{}^- ':
		return (p+1,s[p])
	else: return (p,FatalError('ожидался bnf_class_char'))
	
# reg_class ::= `.` | `[``^`?  (reg_classChar(`-`reg_classChar)?   |quotedSequence     )*`]` 
#  / *=>new RegExp(arg)* /;
def p_reg_class(s,p):
	"""возвращает pp_функцию"""
	if p<len(s) and s[p]=='.':
		def pp_any_char(ss,pp):
			"""возвращает символ"""
			if pp<len(ss): return [(pp+1),ss[pp]]
			else: return [] # FatalError(EOF)
		return (p+1,pp_any_char)
	elif p<len(s) and s[p]=='[':
		p+=1
		if p<len(s) and s[p]=='^':
			p+=1
			negation = True
		else: negation = False
		intervals = [] # сюда будем складывать пары символов и строки
		while True:
			p1 = p
			p,r = p_reg_class_char(s,p)
			if not is_fatal(r):
				start_c = r
				if p<len(s) and s[p]=='-':
					p+=1
					p,r = p_reg_class_char(s,p)
					if is_fatal(r): return (p,r) # FatalError(reg_class_char expected)
					intervals.append((start_c,r))
				else:
					intervals.append(start_c)
			else:
				p=p1
				p,r = p_quoted_sequence(s,p)
				if not is_fatal(r):
					intervals.append(r)
				else:
					p=p1
					break
		if p<len(s) and s[p]==']':
			p+=1
			if negation:
				def pp_char_not_in_set(s,p):
					"""возвращает символ"""
					# nonlocal intervals
					if p>=len(s): return [] # FatalError(EOF) 
					for x in intervals:
						if type(x)==tuple:
							if s[p]>=x[0] and s[p]<=x[1]:
								return [] # FatalError(символ не должен принадлежать множеству)
						else:
							if s[p]in x:
								return [] # FatalError(символ не должен принадлежать множеству)
					return [(p+1,s[p])]
				return (p,pp_char_not_in_set)
			else:
				def pp_char_in_set(s,p):
					"""возвращает символ"""
					# nonlocal intervals
					if p>=len(s): return [] # FatalError(EOF) 
					for x in intervals:
						if type(x)==tuple:
							if s[p]>=x[0] and s[p]<=x[1]:
								return [(p+1,s[p])]
						else:
							if s[p]in x:
								return [(p+1,s[p])]
					return [] # FatalError(символ должен принадлежать множеству)
				return (p,pp_char_in_set)
		else: return (p,FatalError('ожидалась `]`'))
	else: return (p,FatalError('ожидался reg_class'))
	
# bnf_class ::= `.` | `[``^`? spcs 
#    (bnf_classChar(`-`bnf_classChar)? spcs |quotedSequence spcs)*`]` 
#  / *=>new RegExp(arg)* /;
def p_bnf_class(s,p):
	"""возвращает p_функцию"""
	if p<len(s) and s[p]=='.':
		def pp_any_char(ss,pp):
			"""возвращает символ"""
			if pp<len(ss): return [(pp+1),ss[pp]]
			else: return [] # FatalError(EOF)
		return (p+1,pp_any_char)
	elif p<len(s) and s[p]=='[':
		p+=1
		if p<len(s) and s[p]=='^':
			p+=1
			negation = True
		else: negation = False
		p,r = p_spcs(s,p)
		intervals = [] # сюда будем складывать пары символов и строки
		while True:
			p1 = p
			p,r = p_reg_class_char(s,p)
			if not is_fatal(r):
				start_c = r
				if p<len(s) and s[p]=='-':
					p+=1
					p,r = p_reg_class_char(s,p)
					if is_fatal(r): return (p,r) # FatalError(reg_class_char expected)
					intervals.append((start_c,r))
				else:
					intervals.append(start_c)
				p,r = p_spcs(s,p)
			else:
				p=p1
				p,r = p_quoted_sequence(s,p)
				if not is_fatal(r):
					intervals.append(r)
					p,r = p_spcs(s,p)
				else:
					p=p1
					break
		if p<len(s) and s[p]==']':
			p+=1
			if negation:
				def pp_char_not_in_set(s,p):
					"""возвращает символ"""
					# nonlocal intervals
					if p>=len(s): return [] # FatalError(EOF) 
					for x in intervals:
						if type(x)==tuple:
							if s[p]>=x[0] and s[p]<=x[1]:
								return [] # FatalError(символ не должен принадлежать множеству)
						else:
							if s[p]in x:
								return [] # FatalError(символ не должен принадлежать множеству)
					return [(p+1,s[p])]
				return (p,pp_char_not_in_set)
			else:
				def pp_char_in_set(s,p):
					"""возвращает символ"""
					# nonlocal intervals
					if p>=len(s): return [] # FatalError(EOF) 
					for x in intervals:
						if type(x)==tuple:
							if s[p]>=x[0] and s[p]<=x[1]:
								return [(p+1,s[p])]
						else:
							if s[p]in x:
								return [(p+1,s[p])]
					return [] # FatalError(символ должен принадлежать множеству)
				return (p,pp_char_in_set)
		else: return (p,FatalError('ожидалась `]`'))
	else: return (p,FatalError('ожидался bnf_class'))
	
# name_modifier ::= `?` identifier? `=`  || имя последовательности - имя результата
def p_name_modifier(s,p):
	"""возвращет строку"""
	if not (p<len(s) and s[p]=='?'):
		return (p,FatalError('ожидался name_modifier'))
	p+=1
	p1 = p
	p,r = p_identifier(s,p)
	if is_fatal(r):
		iden = ''
		p = p1
	else:
		iden = r
	if p<len(s) and s[p]=='=':
		p+=1
	else:
		return (p,FatalError('ожидалось `=`'))
	return (p,iden)

# seq_handler ::= `/*`(?!`*/`|.)*`*/`
def p_seq_handler(s,p):
	"""возвращает функцию-обработчик"""
	if p+1<len(s) and s[p:p+2]=='/*':
		p+=2
	else: return (p,FatalError('ожидался seq_handler'))
	start_p = p
	have_enter = False
	while True:
		if p+1<len(s) and s[p:p+2]=='*/':
			break
		elif p<len(s):
			if s[p]=='\n': have_enter = True
			p+=1
		else:
			return (p,FatalError('неожиданный конец файла'))
	end_p = p
	p+=2
	if have_enter:
		g = globals()
		try:
			exec('def EXACTLY_UNUSED_NAME'+s[start_p:end_p],g)
			fun = g['EXACTLY_UNUSED_NAME']
		except BaseException as e:
			print(start_p,FatalError('ошибка при компиляции обработчика'),e.offset,e)
			return (start_p,FatalError('ошибка при компиляции обработчика'))
	else:
		try:
			fun = eval('lambda '+s[start_p:end_p])
		except BaseException as e:
			print(start_p,FatalError('ошибка при компиляции обработчика'),e.offset,e)
			return (start_p,FatalError('ошибка при компиляции обработчика'))
	return (p,fun)
	
# alt_handler ::= `//`(?!`*/`|.)*`*/`
def p_alt_handler(s,p):
	"""возвращает функцию-обработчик"""
	if p+1<len(s) and s[p:p+2]=='//':
		p+=2
	else: return (p,FatalError('ожидался alt_handler'))
	start_p = p
	have_enter = False
	while True:
		if p+1<len(s) and s[p:p+2]=='*/':
			break
		elif p<len(s):
			if s[p]=='\n': have_enter = True
			p+=1
		else:
			return (p,FatalError('неожиданный конец файла'))
	end_p = p
	p+=2
	if have_enter:
		g = globals()
		try:
			exec('def EXACTLY_UNUSED_NAME'+s[start_p:end_p],g)
			fun = g['EXACTLY_UNUSED_NAME']
		except BaseException as e:
			print(start_p,FatalError('ошибка при компиляции обработчика'),e.offset,e)
			return (start_p,FatalError('ошибка при компиляции обработчика'))
	else:
		try:
			fun = eval('lambda '+s[start_p:end_p])
		except BaseException as e:
			print(start_p,FatalError('ошибка при компиляции обработчика'),e.offset,e)
			return (start_p,FatalError('ошибка при компиляции обработчика'))
	return (p,fun)
	
# simple_quantifier ::= [`*+?`]
def p_simple_quantifier(s,p):
	"""возвращает объект obj(min=int,max=int,name=...,seq_handlers=list)"""
	# -1 === infinity
	if p<len(s) and s[p]=='*':
		return (p+1,obj(min=0,max=-1,name=None,seq_handlers=[]))
	if p<len(s) and s[p]=='+':
		return (p+1,obj(min=1,max=-1,name=None,seq_handlers=[]))
	if p<len(s) and s[p]=='?':
		return (p+1,obj(min=0,max=1,name=None,seq_handlers=[]))
	else:
		return (p,FatalError('ожидался simple_quantifier'))
	
# complex_quantifier ::= `{`spcs 
#    (name_modifier spcs)? 
#    ([`*+?`] |`,` spcs num | num (spcs `,` spcs num?)? ) spcs 
#    (seq_handler spcs)?
#    `}` ;
def p_complex_quantifier(s,p):
	"""возвращает объект {min:int, max:int, name:..., seq_handler:..., alt_handler:...}"""
	# -1 === infinity
	if p<len(s) and s[p]=='{':
		p+=1
		p,r = p_spcs(s,p)
		p1 = p
		p,r = p_name_modifier(s,p)
		if not is_fatal(r):
			name = r
			p,r = p_spcs(s,p)
		else:
			p = p1
			name = None
		if p<len(s) and s[p]=='*':
			p+=1
			minim = 0
			maxim = -1
		elif p<len(s) and s[p]=='+':
			p+=1
			minim = 1
			maxim = -1
		elif p<len(s) and s[p]=='?':
			p+=1
			minim = 0
			maxim = 1
		elif p<len(s) and s[p]==',':
			p+=1
			minim = 0
			p,r = p_spcs(s,p)
			p,r = p_num(s,p)
			if is_fatal(r):
				return (p,FatalError())
			maxim = r
		else:
			p,r = p_num(s,p)
			if is_fatal(r):
				return (p,FatalError())
			minim = r
			p,r = p_spcs(s,p)
			if p<len(s) and s[p]==',':
				p+=1
				p,r = p_spcs(s,p)
				p1 = p
				p,r = p_num(s,p)
				if is_fatal(r):
					p = p1
					maxim = -1
				else:
					maxim = r
			else:
				maxim = minim
		p,r = p_spcs(s,p)
		
		handlers = []
		p1 = p
		p,r = p_seq_handler(s,p)
		if not is_fatal(r):
			handlers.append(r)
			p,r = p_spcs(s,p)
		else:
			p = p1

		if p<len(s) and s[p]=='}':
			p+=1
		else:
			return (p,FatalError())
		return (p,obj(min=minim,max=maxim,name=name,seq_handlers=handlers))
	else:
		return (p,FatalError('ожидался bnf_quantifier'))
	

# === Паттерны, связанные с классом ===

def method(cls):
	def decorator(func):
		setattr(cls, func.__name__, func)
		return func
	return decorator

class Elist(list):
	def __init__(self,p,mes):
		self.pos = p
		self.mes = mes
		
class Parser:
	def __init__(self):
		self.patterns = {}
		self.cache = {}
		self.main = '__main__'
		
class NoConcat:
	def __init__(self,name):
		self.names = [name]
	def add(self,name):
		self.names.append(name)
		
@method(Parser)
def parse(self,s):
	assert self.main in self.patterns
	rezs = self.patterns[self.main](s,0)
	if len(rezs)==0:
		return rezs
	maxp = max(p for p,r in rezs);
	rezs = [(p,r) for p,r in rezs if p==maxp]
	if maxp!=len(s):
		print('осталось прочитать',len(s)-maxp,'символов',file=err)
	if len(rezs)>1:
		print('получилось больше одного варианта',file=err)
		return rezs
	return rezs[0][1]

	
# ---- Вызов ----

def make_pattern_as_str(self,iden):
	def pp_pattern_as_str(s,p):
		"""возвращает строку"""
		if iden not in self.patterns:
			raise BaseException('pattern "'+iden+'" not defined')
		return [(p,(r if type(r)==str else NoConcat(iden))) 
					for p,r in self.patterns[iden](s,p)]
	return pp_pattern_as_str
	
# reg_str_link ::= `$`  ( ?id=identifier ) /*=>{link:arg.id}* /;
@method(Parser)
def p_reg_str_link(self,s,p):
	"""возвращет пару (тип, p_функция)"""
	if p<len(s) and s[p]=='$':
		p+=1
		p1 = p
		p,r = p_identifier(s,p)
		if is_fatal(r):
			return (p,r)
		else:
			iden = r
			return (p,('string',make_pattern_as_str(self,iden)))
	else:
		return (p,FatalError())
		
# reg_bnf_link ::= {?}`$`  ( ?id=identifier ) /*=>{link:arg.id}* /;
@method(Parser)
def p_bnf_str_link(self,s,p):
	"""возвращет пару (тип, p_функция)"""
	if p<len(s) and s[p]=='$':
		p+=1
	p1 = p
	p,r = p_identifier(s,p)
	if is_fatal(r):
		return (p,r)
	else:
		iden = r
		return (p,('string',make_pattern_as_str(self,iden)))

# obj_direct_link ::= `$` ('(' $identifier ')'
#                          | '{' $identifier {?}([=:] $identifier)'}');
@method(Parser)
def p_obj_direct_link(self,s,p):
	"""возвращет пару (тип, p_функция)"""
	if not(p<len(s) and s[p]=='$'):
		return (p,FatalError())
	p+=1
	if p<len(s) and s[p]=='(':
		p+=1
		p1 = p
		p,r = p_identifier(s,p)
		if is_fatal(r): return p,r
		iden = r
		if not(p<len(s) and s[p]==')'):
			return (p,FatalError())
		p+=1
		def pp_pattern_as_direct(s,p):
			"""возвращает как есть"""
			if iden not in self.patterns:
				raise BaseException('pattern "'+iden+'" not defined')
			return self.patterns[iden](s,p)
		return (p,('direct',pp_pattern_as_direct))
	elif p<len(s) and s[p]=='{':
		p+=1
		p1 = p
		p,r = p_identifier(s,p)
		if is_fatal(r): return p,r
		id1 = r
		id2 = ''
		if p<len(s) and s[p] in ':=':
			p+=1
			p2 = p
			p,r = p_identifier(s,p)
			if is_fatal(r): return (p,r)
			id2 = r
			assert len(id2)>0
		if len(id2)==0: id2 = id1
		name = id1
		iden = id2
		if not(p<len(s) and s[p]=='}'):
			return (p,FatalError())
		p+=1
		def pp_pattern_as_obj(s,p):
			"""берет как есть, возвращает объект"""
			if iden not in self.patterns:
				raise BaseException('pattern "'+iden+'" not defined')
			return [(p,{name:r}) for p,r in self.patterns[iden](s,p)]
		return (p,('obj',pp_pattern_as_obj))
	else:
		return (p,FatalError())
	
# reg_symbol ::= reg_char|quoted_sequence|reg_class|reg_str_link|obj_direct_link;
@method(Parser)
def p_reg_symbol(self,s,p):
	"""возвращет пару (тип, p_функция)"""
	p1 = p
	p,r = p_reg_char(s,p)
	if not is_fatal(r):
		def pp_const_char(s,p):
			"""возвращает символ"""
			if p<len(s) and s[p]==r:
				return [(p+1,s[p])]
			else: return Elist(p,FatalError('ожидался символ '+r))
		return (p,('string',pp_const_char))
	p = p1
	p,r = p_quoted_sequence(s,p)
	if not is_fatal(r):
		def pp_const_str(s,p):
			"""возвращает строку"""
			if p+len(r)<=len(s) and s[p:p+len(r)]==r:
				return [(p+len(r),r)]
			else: return Elist(p,FatalError('ожидалась строка `'+r+'`'))
		return (p,('string',pp_const_str))
	p = p1
	p,r = p_reg_class(s,p)
	if not is_fatal(r):
		return (p,('string',r))
	p = p1
	p,r = self.p_reg_str_link(s,p)
	if not is_fatal(r):
		return p,r
	p = p1
	p,r = self.p_obj_direct_link(s,p)
	if not is_fatal(r):
		return p,r
	return p,r
		
# bnf_symbol ::= bnf_char|quoted_sequence|bnf_class|bnf_str_link|obj_direct_link;
@method(Parser)
def p_bnf_symbol(self,s,p):
	"""возвращет пару (тип, p_функция)"""
	p1 = p
	p,r = p_bnf_char(s,p)
	if not is_fatal(r):
		def pp_const_char(s,p):
			"""возвращает символ"""
			if p<len(s) and s[p]==r:
				return [(p+1,s[p])]
			else: return Elist(p,FatalError('ожидался символ '+r))
		return (p,('string',pp_const_char))
	p = p1
	p,r = p_quoted_sequence(s,p)
	if not is_fatal(r):
		def pp_const_str(s,p):
			"""возвращает строку"""
			if p+len(r)<=len(s) and s[p:p+len(r)]==r:
				return [(p+len(r),r)]
			else: return Elist(p,FatalError('ожидалась строка `'+r+'`'))
		return (p,('string',pp_const_str))
	p = p1
	p,r = p_bnf_class(s,p)
	if not is_fatal(r):
		return (p,('string',r))
	p = p1
	p,r = self.p_bnf_str_link(s,p)
	if not is_fatal(r):
		return p,r
	p = p1
	p,r = self.p_obj_direct_link(s,p)
	if not is_fatal(r):
		return p,r
	return p,r
		
@method(Parser)
def bnf_pattern_symbol(self,name,patt):
	p,r = self.p_bnf_symbol(patt,0)
	if is_fatal(r):
		raise BaseException(r)
	tmp = r
	p,r = p_spcs(patt,p)
	if p!=len(patt):
		raise BaseException('разобран не весь паттерн')
	self.patterns[name] = tmp[1]

	
# ---- Последовательности ----

def pp_common_sequence(patts,s,p):
	"""общая ф-ция для последовательностей 
	+ простая обработка ошибок
	"""
	rezs1 = patts[0](s,p)
	if len(patts)==1:
		return [(p1,(r1,)) for p1,r1 in rezs1]
	if rezs1==[]:
		return rezs1;
	rezs = []
	errs = []
	# todo отсортировать и сгруппировать варианты
	#print(patts[0],rezs1)
	for p1,r1 in rezs1:
		rezs2 = pp_common_sequence(patts[1:],s,p1)
		if rezs2==[]:
			errs.append(rezs2)
		else:
			rezs+=[(p2,(r1,*r2))for p2,r2 in rezs2]
	if len(rezs)==0:
		return Elist(p,errs)
	return rezs
	
def apply_seq_handlers(check_str,handlers,rezs,as_obj = False):
	if len(handlers)==0:
		return rezs
	assert len(handlers)==1
	tmp_rezs = []
	for p,r in rezs:
		error = False
		try:
			if as_obj:
				r = handlers[0](**r)
			else:
				r = handlers[0](r)
		except BaseException as e:
			print(e)
		if check_str:
			if type(r)!=str:
				print('обработчик строковой последовательности должен возвращать строку',file=sys.stderr)
		# игнорируем результат с неправильным обработчиком
		elif not error:
			tmp_rezs.append((p,r))
	return tmp_rezs

def _select_direct(patts,rezs):
	tmp_rezs = []
	for p,r in rezs:
		assert len(r) == len(patts)
		for i in range(len(patts)):
			if patts[i][0]=='direct':
				break
		else: raise BaseException()
		tmp_rezs.append((p,r[i]))
	return tmp_rezs

def _obj_join(patts,rezs):
	tmp_rezs = []
	for p,r in rezs:
		assert len(r) == len(patts)
		o = {}
		for i in range(len(patts)):
			if patts[i][0]=='obj':
				assert type(r[i])==dict
				for k,v in r[i].items():
					if k in o:
						print('повторное использование ключа '+k,file=sys.err)
					o[k]=v
		tmp_rezs.append((p,o))
	return tmp_rezs

def _str_join(rezs,check_NoConcat):
	def foo(r):
		for x in r:
			if type(x)==NoConcat:
				return x
		return ''.join(r)
	if check_NoConcat:
		tmp = []
		for p,r in rezs:
			r = foo(r)
			if type(r)==str:
				tmp.append((p,r))
			elif type(r)==NoConcat:
				print('паттерн',r.names,'ошибочно используется как строковый')
			else:
				raise BaseException()
		return tmp
	else:
		return [(p,foo(r)) for p,r in rezs]
	
def make_sequence(name,patts,handlers):
	string_count = 0
	direct_count = 0
	obj_count = 0
	for t,p in patts:
		if t=='string': string_count+=1
		elif t=='direct': direct_count+=1
		elif t=='obj': obj_count+=1
		else: raise BaseException('неизвестный тип паттерна: '+str(t))
			
	if direct_count>1:
		mes = 'в последовательности количество direct подпоследовательностей не должно превышать одну'
		print(mes)
		return FatalError(mes)
	
	elif name==None              and direct_count==0 and obj_count==0:
		def pp_str_cat(s,p0):
			#строковые - конкатенируем, обработчик должен вернуть строку
			rezs = pp_common_sequence([p for t,p in patts],s,p0)
			if rezs==[]: return rezs
			# assert что все - строки - внутри join
			return apply_seq_handlers(True,handlers,_str_join(rezs,False))
		return ('string',pp_str_cat)
	
	elif name==None              and direct_count==0 and obj_count>0:
		#obj - объединяем объектные, все остальные игнорируем, обработчик НЕдопустим
		def pp_implicit_obj_join(s,p0):
			rezs = pp_common_sequence([p for t,p in patts],s,p0)
			if rezs==[]: return rezs
			return _obj_join(patts,rezs)
		if len(handlers)>0:
			mes = 'у неявной объектной последовательности обработчики НЕ допустимы'
			print(mes)
			return FatalError(mes)
		return ('obj',pp_implicit_obj_join)
	
	elif name==None              and direct_count==1 and obj_count==0:
		#direct - берем только у того, который direct, все остальные игнорируем, 
		# обработчик НЕдопустим
		def pp_implicit_direct_direct(s,p0):
			rezs = pp_common_sequence([p for t,p in patts],s,p0)
			if rezs==[]: return rezs
			return _select_direct(patts,rezs)
		if len(handlers)>0:
			mes = 'у неявной direct последовательности обработчики недопустимы'
			print(mes)
			return FatalError(mes)
		return ('direct',pp_implicit_direct_direct)
	
	elif name==None              and direct_count==1 and obj_count>0:
		mes = 'радом с direct-последовательностью находятся объектные последовательности'
		print(mes)
		return FatalError(mes)
	
	elif name==''                and direct_count==0 and obj_count==0:
		#direct - конкатенируем, обработчик допустим
		def pp_direct_str_cat(s,p0):
			rezs = pp_common_sequence([p for t,p in patts],s,p0)
			if rezs==[]: return rezs
			# assert что все - строки - внутри join
			return apply_seq_handlers(False,handlers,_str_join(rezs,True))
		return ('direct',pp_direct_str_cat)
	
	elif name==''                and direct_count==0 and obj_count>0:
		#obj - объединяем объектные, все остальные игнорируем, обработчик НЕдопустим
		def pp_direct_obj_join(s,p0):
			rezs = pp_common_sequence([p for t,p in patts],s,p0)
			if rezs==[]: return rezs
			return apply_seq_handlers(False,handlers,_obj_join(patts,rezs),as_obj=True)
		return ('direct',pp_direct_obj_join)
	
	elif name==''                and direct_count==1 and obj_count==0:
		#direct - берем только у того, который direct, все остальные игнорируем, 
		# обработчик допустим
		def pp_direct_direct(s,p0):
			rezs = pp_common_sequence([p for t,p in patts],s,p0)
			if rezs==[]: return rezs
			return apply_seq_handlers(False,handlers,_select_direct(patts,rezs))
		return ('direct',pp_direct_direct)
	
	elif name==''                and direct_count==1 and obj_count>0:
		mes = 'радом с direct-последовательностью находятся объектные последовательности'
		print(mes)
		return FatalError(mes)
	
	elif name!=None and name!='' and direct_count==0 and obj_count==0:
		#obj - конкатенируем, обработчик допустим, оборачиваем в объект
		def pp_obj_str_cat(s,p0):
			rezs = pp_common_sequence([p for t,p in patts],s,p0)
			if rezs==[]: return rezs
			# assert что все - строки - внутри join
			return [(p,{name:r}) for p,r in \
					apply_seq_handlers(False,handlers,_str_join(rezs,True))]
		return ('obj',pp_obj_str_cat)
	
	elif name!=None and name!='' and direct_count==0 and obj_count>0:
		#obj - объединяем объектные, все остальные игнорируем, обработчик допустим, 
		# оборачиваем в объект
		def pp_obj_join(s,p0):
			rezs = pp_common_sequence([p for t,p in patts],s,p0)
			if rezs==[]: return rezs
			return [(p,{name:r}) for p,r in \
					apply_seq_handlers(False,handlers,_obj_join(patts,rezs),as_obj=True)]
		return ('obj',pp_obj_join)
	
	elif name!=None and name!='' and direct_count==1 and obj_count==0:
		#obj - берем только у того, который direct, все остальные игнорируем, 
		# обработчик допустим, оборачиваем в объект
		def pp_obj_direct(s,p0):
			rezs = pp_common_sequence([p for t,p in patts],s,p0)
			if rezs==[]: return rezs
			return [(p,{name:r}) for p,r in \
					apply_seq_handlers(False,handlers,_select_direct(patts,rezs))]
		return ('obj',pp_obj_direct)
	
	elif name!=None and name!='' and direct_count==1 and obj_count>0:
		mes = 'радом с direct-последовательностью находятся объектные последовательности'
		print(mes)
		return FatalError(mes)
	
	else:
		raise BaseException('неизветный тип последовательности: '\
							 +str((name,string_count,direct_count,obj_count)))
	
# reg_sequence ::=
#    name_modifier?
#    ( ( reg_symbol | `(` reg_alternatives`)` )
#       (simple_quantifier|complex_quantifier)?
#    )+
#    (seq_handler spcs)?;
@method(Parser)
def p_reg_sequence(self,s,p):
	"""возвращет пару (тип, pp_функция)"""
	name = None
	patts = []
	handlers = []
	
	p0 = p
	p,r = p_name_modifier(s,p)
	if not is_fatal(r):
		name = r
	else:
		p = p0
		
	start_seq_p = p
	while True:
		p1 = p
		patt = None
		p,r = self.p_reg_symbol(s,p)
		if not is_fatal(r):
			patt = r
		else:
			p = p1
			if p<len(s) and s[p]=='(':
				p+=1
				p2 = p
				p,r = self.p_reg_alternatives(s,p) # в дальнейшем p_reg_alternatives
				if is_fatal(r): 
					return p,r
				patt = r
				if not(p<len(s) and s[p]==')'):
					return (p,FatalError())
				p+=1
			else:
				p = p1
				break
				
		p1 = p
		quant = None
		p,r = p_simple_quantifier(s,p)
		if not is_fatal(r):
			quant = r
		else:
			p = p1
			p,r = p_complex_quantifier(s,p)
			if not is_fatal(r):
				quant = r
			else:
				p = p1
				
		if quant == None:
			patts.append(patt)
		else:
			patts.append(make_cycle(patt,quant))
			
	if len(patts)==0:
		return (start_seq_p,FatalError())
	
	p1 = p
	p,r = p_seq_handler(s,p)
	if is_fatal(r):
		p = p1
	else:
		handlers.append(r)
		p,r = p_spcs(s,p)
	
	return (p, make_sequence(name,patts,handlers))

# bnf_sequence_ ::=
#    (name_modifier spcs)?
#    ( (complex_quantifier spcs)?
#      ( bnf_symbol spcs | `(` bnf_alternatives`)` spcs )
#      (cimple_quantifier spcs)?
#    )+
#    (seq_handler spcs)?;
@method(Parser)
def p_bnf_sequence_(self,s,p):
	"""возвращет пару (тип, pp_функция)"""
	name = None
	patts = []
	handlers = []
	
	p0 = p
	p,r = p_name_modifier(s,p)
	if not is_fatal(r):
		name = r
		p,r = p_spcs(s,p)
	else:
		p = p0
		
	start_seq_p = p
	while True:
		patt = None
		quant = None
		
		p1 = p
		p,r = p_complex_quantifier(s,p)
		if not is_fatal(r):
			quant = r
			p,r = p_spcs(s,p)
		else:
			p = p1
		
		p,r = self.p_bnf_symbol(s,p)
		if not is_fatal(r):
			patt = r
			p,r = p_spcs(s,p)
		else:
			p = p1
			if p<len(s) and s[p]=='(':
				p+=1
				p2 = p
				p,r = self.p_bnf_alternatives_(s,p) # в дальнейшем p_reg_alternatives
				if is_fatal(r): 
					return p,r
				patt = r
				if not(p<len(s) and s[p]==')'):
					return (p,FatalError())
				p+=1
				p,r = p_spcs(s,p)
			else:
				p = p1
				break
				
		p1 = p
		p,r = p_simple_quantifier(s,p)
		if not is_fatal(r):
			if quant!=None:
				mes = 'нельзя одному и тому же объекту указать и простой и сложный квантификатор'
				print(mes)
				return (p,FtalError(mes))
			quant = r
			p,r = p_spcs(s,p)
		else:
			p = p1
		
		if quant == None:
			patts.append(patt)
		else:
			patts.append(make_cycle(patt,quant))
			
	if len(patts)==0:
		return (start_seq_p,FatalError())
	
	p1 = p
	p,r = p_seq_handler(s,p)
	if is_fatal(r):
		p = p1
	else:
		handlers.append(r)
		p,r = p_spcs(s,p)
	
	return (p, make_sequence(name,patts,handlers))

	
# ---- Циклы ----

# obj(**{min:int, max:int, name:..., seq_handlers:...})
def make_cycle(pattern,quantifier):
	""""""
	name = quantifier.name
	handlers = quantifier.seq_handlers
	minim = quantifier.min
	maxim = quantifier.max
	if quantifier.min==0 and quantifier.max==1:
		def pp_common_opt(s,p):
			rezs = pattern[1](s,p)
			if rezs==[]:
				return [(p,'')]
			else:
				rezs.append((p,''))
				return rezs
		pp_cycle = pp_common_opt
	else:
		def pp_common_rep(s,p):
			arr = []
			i=0
			for i in range(minim):
				rezs = pattern[1](s,p)
				if rezs==[]: return rezs
				if len(rezs)>1:
					print('отбрасываем лишние варианты в цикле',file=sys.stderr)
				p = rezs[0][0]
				arr.append(rezs[0][1])
			i=i
			while maxim==-1 or i<maxim:
				rezs = pattern[1](s,p)
				if rezs==[]: 
					return [(p,arr)]
				if len(rezs)>1:
					print('отбрасываем лишние варианты в цикле',file=sys.stderr)
				p = rezs[0][0]
				arr.append(rezs[0][1])
				i+=1
			return [(p,arr)]
		pp_cycle = pp_common_rep
	
	def pp_str_cat(s,p):
		#string - конкатенируем, обработчик допустим, проверяем тип - строка
		rezs = pp_cycle(s,p)
		if rezs == []: return rezs
		return apply_seq_handlers(True,handlers,
								  [(p,''.join(r)) for p,r in rezs])
	
	if   name==None              and pattern[0]=='string':
		#string - конкатенируем, обработчик допустим, проверяем тип - строка
		return ('string',pp_str_cat)
	elif name==None              and pattern[0]=='direct' or\
		 name==None              and pattern[0]=='obj':
		#direct - обработчик не допустим
		if len(handlers)>0:
			mes = 'у неявной объектной последовательности обработчики недопустимы'
			print(mes)
			return FatalError(mes)
		return ('direct',pp_cycle)
	elif name==''                and pattern[0]=='string':
		#direct - конкатенируем, обработчик допустим, проверяем тип - строка
		return ('direct',pp_str_cat)
	elif name==''                and pattern[0]=='direct' or\
		 name==''                and pattern[0]=='obj':
		#direct - обработчик допустим
		def pp_just_handle(s,p):
			rezs = pp_cycle(s,p)
			if rezs == []: return rezs
			return apply_seq_handlers(False,handlers,rezs)
		return ('direct',pp_just_handle)
	elif name!=None and name!='' and pattern[0]=='string':
		#obj - конкатенируем, оборачиваем в объект, 
		#  обработчик допустим, проверяем тип - строка
		def pp_name_cat(s,p):
			rezs = pp_cycle(s,p)
			if rezs == []: return rezs
			return apply_seq_handlers(True,handlers,
									  [(p,{name:''.join(r)}) for p,r in rezs])
		return ('obj',pp_name_cat)
	elif name!=None and name!='' and pattern[0]=='direct' or\
		 name!=None and name!='' and pattern[0]=='obj':
		#obj - оборачиваем в объект, обработчик допустим
		def pp_name(s,p):
			rezs = pp_cycle(s,p)
			if rezs == []: return rezs
			return apply_seq_handlers(False,handlers,
									  [(p,{name:r}) for p,r in rezs])
		return ('obj',pp_name_cat)
	else: raise BaseException()

	
# ---- Перечисления ----

def make_alternatives(seqs,handlers):
	direct_count = 0
	obj_count = 0
	string_count = 0
	for seq in seqs:
		if seq[0]=='direct': direct_count+=1
		elif seq[0]=='obj': obj_count+=1
		elif seq[0]=='string': string_count+=1
		else: raise BaseException()
	def pp_direct_alt(s,p0):
		all_rezs = []
		all_errs = []
		for seq in seqs:
			rezs = seq[1](s,p0)
			if rezs==[]:
				all_errs.append(rezs)
			else:
				if seq[0]=='string':
					all_rezs+=[(p,{}) for p,r in rezs]
				else:
					all_rezs+=rezs
		if len(all_rezs)==0:
			return [(p0,FatalError(all_errs))]
		else:
			for handler in handlers:
				all_rezs = handler(all_rezs)
				assert type(all_rezs)==list
				#for 
			return all_rezs
	def pp_string_alt(s,p0):
		all_rezs = []
		all_errs = []
		for seq in seqs:
			rezs = seq[1](s,p0)
			if rezs==[]:
				all_errs.append(rezs)
			else:
					all_rezs+=rezs
		if len(all_rezs)==0:
			return [(p0,FatalError(all_errs))]
		else:
			for handler in handlers:
				all_rezs = handler(all_rezs)
				assert type(all_rezs)==list
				#for 
			return all_rezs
	if direct_count>0:
		if string_count>0:
			print('warning: в альтернативах строковые функции рядом с direct будут возвращать пустой объект')
		return ('direct',pp_direct_alt)
	elif obj_count>0:
		if string_count>0:
			print('warning: в альтернативах строковые функции рядом с direct будут возвращать пустой объект')
		return ('obj',pp_direct_alt)
	elif string_count>0:
		return ('string',pp_string_alt)
	else: raise BaseException()
	
# reg_alternatives ::= reg_sequence (`|` reg_sequence)*  alt_handler?
@method(Parser)
def p_reg_alternatives(self,s,p):
	"""возвращет пару (тип, pp_функция)"""
	p1 = p
	p,r = self.p_reg_sequence(s,p)
	if is_fatal(r):
		return p,r
	seqs = [r]
	while p<len(s) and s[p]=='|':
		p+=1
		p,r = self.p_reg_sequence(s,p)
		if is_fatal(r):
			return p,r
		seqs.append(r)
	handlers = []

	p1 = p
	p,r = p_alt_handler(s,p)
	if not is_fatal(r):
		handlers.append(r)
	else:
		p = p1

	if len(seqs)==1 and len(handlers)==0:
		return (p,seqs[0])
	return (p,make_alternatives(seqs,handlers))
	
# bnf_alternatives_ ::= bnf_sequence_ (`|` spcs bnf_sequence_)*  (alt_handler spcs)?
@method(Parser)
def p_bnf_alternatives_(self,s,p):
	"""возвращет пару (тип, pp_функция)"""
	p1 = p
	p,r = self.p_bnf_sequence_(s,p)
	if is_fatal(r):
		return p,r
	seqs = [r]
	while p<len(s) and s[p]=='|':
		p+=1
		p,r = p_spcs(s,p)
		p,r = self.p_bnf_sequence_(s,p)
		if is_fatal(r):
			return p,r
		seqs.append(r)
	handlers = []
	p1 = p
	p,r = p_alt_handler(s,p)
	if not is_fatal(r):
		handlers.append(r)
		p,r = p_spcs(s,p)
	else:
		p = p1

	if len(seqs)==1 and len(handlers)==0:
		return (p,seqs[0])
	return (p,make_alternatives(seqs,handlers))
	
