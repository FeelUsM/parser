import sys

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
	def __eq__(self,other):
		if type(self)!=type(other): return NotImplemented
		return self.__dict__==other.__dict__ and self.__keys==other.__keys
	
class FatalError():
	def __init__(self,mes=''):
		self.mes = mes
	def __repr__(self):
		return 'FatalError('+repr(self.mes)+')'
	def __eq__(self,other):
		if type(self)!=type(other): return NotImplemented
		return self.__dict__==other.__dict__
def is_fatal(x):
	if x==FatalError: raise Exception(FatalError)
	return type(x)==FatalError

depth = 0
debug = False
tail_error = []
def dwr(fun): #debug wrapper
	#return fun
	def wr(*args):
		p0 = args[-1]
		if type(p0)!=int:
			p0 = args[-2]
		assert type(p0)==int
		global depth
		global tail_error
		if debug: print(depth*'  ','{',p0,fun.__name__)
		#if debug: print(depth*'  ',tail_error)
		depth+=1
		lte = tail_error
		tail_error = []
		try:
			p,r = fun(*args)
			if is_fatal(r) or p==p0:
				tail_error+=lte
		finally:
			depth-=1
		if debug:
			print(depth*'  ','}')
			print(depth*'  ',' ',p0,fun.__name__,p,repr(r))
		return p,r
	wr.__name__ = fun.__name__
	return wr
	
def p_alt(patts,s,p):
	errs = []
	for p_patt in patts:
		p1 = p
		p,r = p_patt(s,p)
		if is_fatal(r):
			errs.append((p,r))
			p = p1
		else:
			return p,r
	mp = max(p for p,r in errs)
	errs = [(p,r) for p,r in errs if p==mp]
	if len(errs)==1:
		return errs[0]
	return p,FatalError(errs)
	
# spc :=[\ \r\n\t\v\f]|`(|`(?!`|)`|.)*`|)`|`||`[^\r\n\v\f]*[\r\n\v\f];
"""возвращает пробел"""
#   todo комментарии не реализованы
# spcs:=$spc*;
"""возвращает пробел"""
# num :=[0-9]+;
"""возвращает число"""
# identifier :=[a-zA-Z_][a-zA-Z_0-9]*;
"""возвращает строку"""

# reg_quoted_sequence ::='\\Q' (?!'\\E')* '\\E' ;
"""возвращает строку"""
# reg_char :=[^\\\/\Q;|$.*+?()[]{}\E]|\\[^QE];
#  || здесь перечислены управляющие символы, остальные символы считаются обычными
#  || ^-\/;|$.*+?()[]{}
"""возвращает символ"""
# reg_class_char ::= [^\\\/`^-;|$.*+?()[]{}`] | `\\`[^QE];
#  || к управляющим символам добавляется `^-`, пробелы разрешены
"""возвращает символ"""
# reg_class ::= `.` | `[``^`?  (reg_classChar(`-`reg_classChar)?   |quotedSequence     )*`]` 
#  / *=>new RegExp(arg)* /;
"""возвращает pp_функцию"""

# bnf_char :=\\.;
#  || любые символы считаются управляющими, обычные символы надо брать в кавычки или экранировать
#  а управляющие символы сначала надо брать в кавычки а потом еще и экранировать внутри кавычек
"""возвращает символ"""
# bnf_class_char ::= [^\\\/\``^-;|$.*+?()[]{}'" `]| `\\`.;
#  || к управляющим символам добавляется `^-'" `, пробелы запрещены
"""возвращает строку"""
# bnf_quoted_sequence ::=\' ( [^\'\\] | \\\' | \\\\)* \' | \" ( [^\"\\] | \\\" | \\\\)* \" ;
"""возвращает строку"""
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
# reg_symbol ::= reg_char|reg_quoted_sequence|reg_class|reg_str_link|obj_direct_link;
"""возвращет пару (тип, pp_функция)"""
# bnf_symbol ::= bnf_char|bnf_quoted_sequence|bnf_class|bnf_str_link|obj_direct_link;
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
@dwr
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
	
#escaped::=\\([`'"`\`abfnrtv]|[0-7]{1,3}|\x[a-fA_F0-9]{2}|\u[a-fA_F0-9]{4}|\U[a-fA_F0-9]{8}|\N\{identifier\})
@dwr
def p_escaped(s,p):
	"""возвращает символ"""
	if p<len(s) and s[p]=='\\':
		p+=1
	else:
		return (p,FatalError('escaped char expected'))
	if p<len(s) and s[p] in r'\'"`abfnrtv':
		if   s[p]=='"': return (p+1,'"')
		elif s[p]=="'": return (p+1,"'")
		elif s[p]=='`': return (p+1,'`')
		elif s[p]=='\\': return (p+1,'\\')
		elif s[p]=='a': return (p+1,'\a')
		elif s[p]=='b': return (p+1,'\b')
		elif s[p]=='f': return (p+1,'\f')
		elif s[p]=='n': return (p+1,'\n')
		elif s[p]=='r': return (p+1,'\r')
		elif s[p]=='t': return (p+1,'\t')
		elif s[p]=='v': return (p+1,'\v')
		else: raise Exception(s[p])
	elif p<len(s) and s[p] in '01234567':
		tmp = s[p]
		p+=1
		if p<len(s) and s[p] in '01234567':
			tmp+=s[p]
			p+=1
			if p<len(s) and s[p] in '01234567':
				tmp+=s[p]
				return p+1,chr(int(tmp,8))
			else:
				return p,chr(int(tmp,8))
		else:
			return p,chr(int(tmp,8))
	elif p<len(s) and s[p]=='x':
		p+=1
		tmp = ''
		for i in range(2):
			if p<len(s) and s[p] in '0123456789abcdefABCDEF':
				tmp+=s[p]
				p+=1
			else: 
				#print(p,'expected only 2 hex digits',file=sys.stderr)
				return (p,FatalError('expected only 2 hex digits'))
		return (p,chr(int(tmp,16)))
	elif p<len(s) and s[p]=='u':
		p+=1
		tmp = ''
		for i in range(4):
			if p<len(s) and s[p] in '0123456789abcdefABCDEF':
				tmp+=s[p]
				p+=1
			else: 
				#print(p,'expected only 4 hex digits',file=sys.stderr)
				return (p,FatalError('expected only 4 hex digits'))
		return p,chr(int(tmp,16))
	elif p<len(s) and s[p]=='U':
		p+=1
		tmp = ''
		for i in range(8):
			if p<len(s) and s[p] in '0123456789abcdefABCDEF':
				tmp+=s[p]
				p+=1
			else: 
				#print(p,'expected only 8 hex digits',file=sys.stderr)
				return (p,FatalError('expected only 8 hex digits'))
		return p,chr(int(tmp,16))
	else: return (p,FatalError('unexpected type of escaped seq'))
	
REG_CHAR_CONTROL_CHARACTERS = r'\/;|$.*+?()[]{}'
REG_CHAR_CLASS_CONTROL_CHARACTERS = REG_CHAR_CONTROL_CHARACTERS+'^-'
BNF_CHAR_CLASS_CONTROL_CHARACTERS = REG_CHAR_CLASS_CONTROL_CHARACTERS+'"`'+"'"

# reg_char :=[^\\\/\Q;|$.*+?()[]{}\E]|escaped|\\[^QE];
#  || здесь перечислены управляющие символы, остальные символы считаются обычными
#  || ^-\/;|$.*+?()[]{}
@dwr
def p_reg_char(s,p):
	"""возвращает символ"""
	p1 = p
	p,r = p_escaped(s,p)
	if is_fatal(r):
		if p>p1+1:
			return p,r
		p=p1
	else:
		return p,r
		
	if p<len(s) and s[p]=='\\':
		p+=1
		if p<len(s) and s[p] not in 'QE':
			return (p+1,s[p])
		else: return (p,FatalError('ожидался reg_cahr'))
		
	elif p<len(s) and s[p] not in REG_CHAR_CONTROL_CHARACTERS:
		return (p+1,s[p])
	else: return (p,FatalError('ожидался reg_cahr'))

# reg_class_char ::= [^\\\/`^-;|$.*+?()[]{}`] |escaped| `\\`[^QE];
#  || к управляющим символам добавляется `^-`, пробелы разрешены
@dwr
def p_reg_class_char(s,p):
	"""возвращает символ"""
	p1 = p
	p,r = p_escaped(s,p)
	if is_fatal(r):
		if p>p1+1:
			return p,r
		p=p1
	else:
		return p,r
		
	if p<len(s) and s[p]=='\\':
		p+=1
		if p<len(s) and s[p] not in 'QE':
			return (p+1,s[p])
		else: return (p,FatalError('ожидался reg_class_char'))
	elif p<len(s) and s[p] not in REG_CHAR_CLASS_CONTROL_CHARACTERS:
		return (p+1,s[p])
	else: return (p,FatalError('ожидался reg_class_char'))
	
# reg_quoted_sequence ::='\\Q' (?!'\\E')+ '\\E' ;
@dwr
def p_reg_quoted_sequence(s,p):
	"""возвращает строку"""
	if p+1<len(s) and s[p]=='\\' and s[p+1]=='Q':
		p+=2
	else: return (p,FatalError('ожидалась строка, начинающаяся со \\Q'))
	p0 = p
	rs = ''
	while p<len(s):
		
		if s[p]=='\\':
			p+=1
			if not p<len(s): return (p,FatalError('unexpected end of file'))
			if s[p]=='E': 
				p+=1
				break
			elif s[p]=='\\': rs+=r'\\'
			else:
				#print('at position',p,'found unexpected escape sequence \\'+s[p],file=sys.err)
				rs+='\\'+s[p]
			p+=1
		else:
			rs+=s[p]
			p+=1
	else: return (p,FatalError('неожиданный конец файла внутри строкового литерала от '+str(p0)))
	#if len(rs)==0: return p,FatalError('reg_quoted_sequence не может быть длины 0')
	return (p,rs)
		

# bnf_char :=\\.;
#  || любые символы считаются управляющими, обычные символы надо брать в кавычки или экранировать
#  а управляющие символы сначала надо брать в кавычки а потом еще и экранировать внутри кавычек
@dwr
def p_bnf_char(s,p):
	"""возвращает символ"""
	if p<len(s) and s[p]=='\\':
		p+=1
		if p<len(s):
			return (p+1,s[p])
		else: return (p,FatalError('неожиданный конец файла'))
	else: return (p,FatalError('ожидался bnf_char'))
	
# bnf_class_char ::= [^\\\/\``^-;|$.*+?()[]{}'" `]| `\\`.;
#  || к управляющим символам добавляется `^-'" `, пробелы запрещены
@dwr
def p_bnf_class_char(s,p):
	"""возвращает символ"""
	p1 = p
	p,r = p_escaped(s,p)
	if is_fatal(r):
		if p>p1+1:
			return p,r
		p=p1
	else:
		return p,r
	if p<len(s) and s[p]=='\\':
		p+=1
		if p<len(s):
			return (p+1,s[p])
		else: return (p,FatalError('неожиданный конец файла'))
	elif p<len(s) and s[p] not in BNF_CHAR_CLASS_CONTROL_CHARACTERS:
		return (p+1,s[p])
	else: return (p,FatalError('ожидался bnf_class_char'))
	
# bnf_quoted_sequence ::=\' ( [^\'\\] | \\\' | \\\\)+ \' | \" ( [^\"\\] | \\\" | \\\\)+ \" ;
@dwr
def p_bnf_quoted_sequence(s,p):
	"""возвращает строку"""
	if p<len(s) and s[p] in '\'"':
		q_char = s[p]
		p+=1
		
		p0 = p
		rs = ''
		while p<len(s) and s[p]!=q_char:
			#print('  '*depth,p,1)
			p1 = p
			p,r = p_escaped(s,p)
			if is_fatal(r):
				if p>p1+1:
					return p,r
				p=p1
				tail_error.append((p,r))
			else:
				rs+=r
				continue
				
			#print('  '*depth,p,2)
			if s[p]=='\\':
				p+=1
				if not p<len(s): return (p,FatalError('неожиданный конец файла внутри строки'))
				if s[p]=='\n': pass
				else:
					print('at position',p,'found unexpected escape sequence \\'+s[p],file=sys.stderr)
					rs+=s[p]
				p+=1
			else:
				#print('  '*depth,p,3)
				rs+=s[p]
				p+=1
		if p<len(s) and s[p]==q_char:
			p+=1
			#if len(rs)==0: return p,FatalError('bnf_quoted_sequence не может быть длины 0')
			return (p,rs)
		else: return (p,FatalError('неожиданный конец файла внутри строкового литерала от '+str(p0)))
	elif p<len(s) and s[p] in '`':
		q_char = s[p]
		p+=1
		
		p0 = p
		rs = ''
		while p<len(s) and s[p]!=q_char:
			if s[p]=='\\':
				p+=1
				if not p<len(s): return (p,FatalError('неожиданный конец файла внутри строки'))
				rs+='\\'+s[p]
				p+=1
			else:
				rs+=s[p]
				p+=1
		if p<len(s) and s[p]==q_char:
			p+=1
			#if len(rs)==0: return p,FatalError('bnf_quoted_sequence не может быть длины 0')
			return (p,rs)
		else: return (p,FatalError('неожиданный конец файла внутри строкового литерала от '+str(p0)))
	else: 
		return (p,FatalError('ожидалась строка в кавычках'))

	
# reg_class ::= `.` | `[``^`?  (reg_classChar(`-`reg_classChar)?   |quotedSequence     )*`]` 
#  / *=>new RegExp(arg)* /;
@dwr
def p_reg_class(s,p):
	"""возвращает pp_функцию"""
	global tail_error
	if p<len(s) and s[p]=='.':
		def pp_any_char(ss,pp):
			"""возвращает символ"""
			if pp<len(ss): return [(pp+1),ss[pp]]
			else: return Elist(p,FatalError('unexpected end of file')) 
		return (p+1,pp_any_char)
	elif p<len(s) and s[p]=='[':
		p+=1
		if p<len(s) and s[p]=='^':
			p+=1
			negation = True
		else: 
			tail_error.append((p,FatalError('ожидался символ "^"')))
			negation = False
		intervals = [] # сюда будем складывать пары символов и строки
		while True:
			errs = []
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
					tail_error.append((p,FatalError('ожидался символ "-"')))
					intervals.append(start_c)
			else:
				errs.append((p,r))
				p=p1
				p,r = p_reg_quoted_sequence(s,p)
				if not is_fatal(r):
					intervals.append(r)
				else:
					errs.append((p,r))
					p=p1
					tail_error+=errs
					break
		if p<len(s) and s[p]==']':
			p+=1
			if negation:
				def pp_char_not_in_set(s,p):
					"""возвращает символ"""
					# nonlocal intervals
					if p>=len(s): return Elist(p,FatalError('unexpected end of file')) 
					for x in intervals:
						if type(x)==tuple:
							if s[p]>=x[0] and s[p]<=x[1]:
								return Elist(p,FatalError('символ не должен принадлежать множеству '+repr(intervals)))
						else:
							if s[p]in x:
								return Elist(p,FatalError('символ не должен принадлежать множеству '+repr(intervals)))
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
					return Elist(p,FatalError('символ должен принадлежать множеству '+repr(intervals)))
				return (p,pp_char_in_set)
		else: return (p,FatalError('ожидалась `]`'))
	else: return (p,FatalError('ожидался reg_class'))
	
# bnf_class ::= `.` | `[``^`? spcs 
#    (bnf_class_char(`-`bnf_class_char)? spcs |quoted spcs)*`]` 
#  / *=>new RegExp(arg)* /;
@dwr
def p_bnf_class(s,p):
	"""возвращает p_функцию"""
	global tail_error
	if p<len(s) and s[p]=='.':
		def pp_any_char(ss,pp):
			"""возвращает символ"""
			if pp<len(ss): return [(pp+1),ss[pp]]
			else: return Elist(p,FatalError('unexpected end of file')) 
		return (p+1,pp_any_char)
	elif p<len(s) and s[p]=='[':
		p+=1
		if p<len(s) and s[p]=='^':
			p+=1
			negation = True
		else: 
			tail_error.append((p,FatalError('ожидался символ "^"')))
			negation = False
		p,r = p_spcs(s,p)
		intervals = [] # сюда будем складывать пары символов и строки
		while True:
			errs = []
			p1 = p
			p,r = p_bnf_class_char(s,p)
			if not is_fatal(r):
				start_c = r
				if p<len(s) and s[p]=='-':
					p+=1
					p,r = p_bnf_class_char(s,p)
					if is_fatal(r): return (p,r) # FatalError(reg_class_char expected)
					intervals.append((start_c,r))
				else:
					tail_error.append((p,FatalError('ожидался символ "-"')))
					intervals.append(start_c)
				p,r = p_spcs(s,p)
			else:
				errs.append((p,r))
				p=p1
				p,r = p_bnf_quoted_sequence(s,p)
				if not is_fatal(r):
					intervals.append(r)
					p,r = p_spcs(s,p)
				else:
					errs.append((p,r))
					p=p1
					tail_error+=errs
					break
		if p<len(s) and s[p]==']':
			p+=1
			if negation:
				def pp_char_not_in_set(s,p):
					"""возвращает символ"""
					# nonlocal intervals
					if p>=len(s): return Elist(p,FatalError('unexpected end of file'))   
					for x in intervals:
						if type(x)==tuple:
							if s[p]>=x[0] and s[p]<=x[1]:
								return Elist(p,FatalError('символ не должен принадлежать множеству '+repr(intervals)))
						else:
							if s[p]in x:
								return Elist(p,FatalError('символ не должен принадлежать множеству '+repr(intervals)))
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
					return Elist(p,FatalError('символ должен принадлежать множеству '+repr(intervals)))
				return (p,pp_char_in_set)
		else: return (p,FatalError('ожидалась `]`'))
	else: return (p,FatalError('ожидался bnf_class'))
	
# name_modifier ::= `?` identifier? `=`  || имя последовательности - имя результата
@dwr
def p_name_modifier(s,p):
	"""возвращет строку"""
	if not (p<len(s) and s[p]=='?'):
		return (p,FatalError('ожидался name_modifier'))
	p+=1
	p1 = p
	p,r = p_identifier(s,p)
	if is_fatal(r):
		iden = ''
		tail_error.append((p,r))
		p = p1
	else:
		iden = r
	if p<len(s) and s[p]=='=':
		p+=1
	else:
		return (p,FatalError('ожидалось `=`'))
	return (p,iden)

# seq_handler ::= `/*`(?!`*/`|.)*`*/`
@dwr
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
		except Exception as e:
			print(start_p,FatalError('ошибка при компиляции обработчика'),e.offset,e)
			return (start_p,FatalError('ошибка при компиляции обработчика'))
	else:
		try:
			fun = eval('lambda '+s[start_p:end_p])
		except Exception as e:
			print(start_p,FatalError('ошибка при компиляции обработчика'),e.offset,e)
			return (start_p,FatalError('ошибка при компиляции обработчика'))
	return (p,fun)
	
# alt_handler ::= `//`(?!`*/`|.)*`*/`
@dwr
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
		except Exception as e:
			print(start_p,FatalError('ошибка при компиляции обработчика'),e.offset,e)
			return (start_p,FatalError('ошибка при компиляции обработчика'))
	else:
		try:
			fun = eval('lambda '+s[start_p:end_p])
		except Exception as e:
			print(start_p,FatalError('ошибка при компиляции обработчика'),e.offset,e)
			return (start_p,FatalError('ошибка при компиляции обработчика'))
	return (p,fun)
	
# simple_quantifier ::= [`*+?`]
@dwr
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
@dwr
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
			tail_error.append((p,r))
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
				tail_error.append((p,r))
				return (p,r) # FatalError
			maxim = r
		else:
			p,r = p_num(s,p)
			if is_fatal(r):
				return (p,FatalError('ожидалось "*" или "+" или "-" или "," или число'))
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
				tail_error.append((p,FatalError('ожидалась ","')))
				maxim = minim
		p,r = p_spcs(s,p)
		
		handlers = []
		p1 = p
		p,r = p_seq_handler(s,p)
		if not is_fatal(r):
			handlers.append(r)
			p,r = p_spcs(s,p)
		else:
			tail_error.append((p,r))
			p = p1

		if p<len(s) and s[p]=='}':
			p+=1
		else:
			return (p,FatalError('ожидалась "}"'))
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
	def __init__(self,main='main',trace_log=False):
		self.patterns = {}
		self.cache = {}
		self.cur_s = None
		self.main = main
		self.trace_log = trace_log
		self.depth = 0
		
class NoConcat:
	def __init__(self,name):
		self.names = [name]
	def add(self,name):
		self.names.append(name)
		
@method(Parser)
def parse(self,s,patt=None):
	assert self.main in self.patterns
	if patt==None: patt = self.main
	rezs = self.patterns[patt](s,0)
	if len(rezs)==0:
		print('не получилось ни одного варианта',file=sys.stderr)
		return rezs
	maxp = max(p for p,r in rezs);
	rezs = [(p,r) for p,r in rezs if p==maxp]
	if maxp!=len(s):
		print('осталось прочитать',len(s)-maxp,'символов',file=sys.stderr)
	if len(rezs)>1:
		print('получилось больше одного варианта',file=sys.stderr)
		return rezs
	return rezs[0][1]

	
# ---- Вызов ----

def make_pattern_as_str(self,iden):
	def pp_pattern_as_str(s,p):
		"""возвращает строку"""
		if iden not in self.patterns:
			raise Exception('pattern "'+iden+'" not defined')
		return [(p,(r if type(r)==str else NoConcat(iden))) 
					for p,r in self.patterns[iden](s,p)]
	return pp_pattern_as_str
	
# reg_str_link ::= `$`  ( ?id=identifier ) /*=>{link:arg.id}* /;
@method(Parser)
@dwr
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
		return (p,FatalError('ожидался reg_str_link'))
		
# reg_bnf_link ::= {?}`$`  ( ?id=identifier ) /*=>{link:arg.id}* /;
@method(Parser)
@dwr
def p_bnf_str_link(self,s,p):
	"""возвращет пару (тип, p_функция)"""
	if p<len(s) and s[p]=='$':
		p+=1
	else:
		tail_error.append((p,FatalError('ожидался "$"')))
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
@dwr
def p_obj_direct_link(self,s,p):
	"""возвращет пару (тип, p_функция)"""
	if not(p<len(s) and s[p]=='$'):
		return (p,FatalError('p_obj_direct_link expected'))
	p+=1
	if p<len(s) and s[p]=='(':
		p+=1
		p1 = p
		p,r = p_identifier(s,p)
		if is_fatal(r): return p,r
		iden = r
		if not(p<len(s) and s[p]==')'):
			return (p,FatalError('")" expected'))
		p+=1
		def pp_pattern_as_direct(s,p):
			"""возвращает как есть"""
			if iden not in self.patterns:
				raise Exception('pattern "'+iden+'" not defined')
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
		else:
			tail_error.append((p,FatalError('ожидался символ ":" или "="')))
		if len(id2)==0: id2 = id1
		name = id1
		iden = id2
		if not(p<len(s) and s[p]=='}'):
			return (p,FatalError('"}" expected'))
		p+=1
		def pp_pattern_as_obj(s,p):
			"""берет как есть, возвращает объект"""
			if iden not in self.patterns:
				raise Exception('pattern "'+iden+'" not defined')
			return [(p,{name:r}) for p,r in self.patterns[iden](s,p)]
		return (p,('obj',pp_pattern_as_obj))
	else:
		return (p,FatalError('"(" or "{" expected'))
	
# reg_symbol ::= reg_char|reg_quoted_sequence|reg_class|reg_str_link|obj_direct_link;
@method(Parser)
@dwr
def p_reg_symbol(self,s,p):
	"""возвращет пару (тип, p_функция)"""
	errs = []
	p1 = p
	p,r = p_reg_char(s,p)
	if not is_fatal(r):
		def pp_const_char(s,p):
			"""возвращает символ"""
			if p<len(s) and s[p]==r:
				return [(p+1,s[p])]
			else: return Elist(p,FatalError('ожидался символ '+r))
		return (p,('string',pp_const_char))
	else: errs.append((p,r))
	p = p1
	p,r = p_reg_quoted_sequence(s,p)
	#print('p_reg_symbol',p,r)
	if not is_fatal(r):
		def pp_const_str(s,p):
			"""возвращает строку"""
			#print('pp_const_str',p,s[p:p+len(r)],r)
			if p+len(r)<=len(s) and s[p:p+len(r)]==r:
				return [(p+len(r),r)]
			else: return Elist(p,FatalError('ожидалась строка `'+r+'`'))
		return (p,('string',pp_const_str))
	else: errs.append((p,r))
	p = p1
	p,r = p_reg_class(s,p)
	if not is_fatal(r):
		return (p,('string',r))
	else: errs.append((p,r))
	p = p1
	p,r = self.p_reg_str_link(s,p)
	if not is_fatal(r):
		return p,r
	else: errs.append((p,r))
	p = p1
	p,r = self.p_obj_direct_link(s,p)
	if not is_fatal(r):
		return p,r
	else: errs.append((p,r))
		
	mp = max(p for p,r in errs)
	errs = [(p,r) for p,r in errs if p==mp]
	if len(errs)==1:
		return errs[0]
	return p,FatalError(errs)
		
# bnf_symbol ::= bnf_char|bnf_quoted_sequence|bnf_class|bnf_str_link|obj_direct_link;
@method(Parser)
@dwr
def p_bnf_symbol(self,s,p):
	"""возвращет пару (тип, p_функция)"""
	errs = []
	p1 = p
	p,r = p_bnf_char(s,p)
	if not is_fatal(r):
		def pp_const_char(s,p):
			"""возвращает символ"""
			if p<len(s) and s[p]==r:
				return [(p+1,s[p])]
			else: return Elist(p,FatalError('ожидался символ '+r))
		return (p,('string',pp_const_char))
	else: errs.append((p,r))
	p = p1
	p,r = p_bnf_quoted_sequence(s,p)
	if not is_fatal(r):
		def pp_const_str(s,p):
			"""возвращает строку"""
			if p+len(r)<=len(s) and s[p:p+len(r)]==r:
				return [(p+len(r),r)]
			else: return Elist(p,FatalError('ожидалась строка `'+r+'`'))
		return (p,('string',pp_const_str))
	else: errs.append((p,r))
	p = p1
	p,r = p_bnf_class(s,p)
	if not is_fatal(r):
		return (p,('string',r))
	else: errs.append((p,r))
	p = p1
	p,r = self.p_bnf_str_link(s,p)
	if not is_fatal(r):
		return p,r
	else: errs.append((p,r))
	p = p1
	p,r = self.p_obj_direct_link(s,p)
	if not is_fatal(r):
		return p,r
	else: errs.append((p,r))
		
	mp = max(p for p,r in errs)
	errs = [(p,r) for p,r in errs if p==mp]
	if len(errs)==1:
		return errs[0]
	return p,FatalError(errs)
		
	
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
			#print('apply->',r)
		except Exception as e:
			print('ошибка в обработчике:',e)
			error = True
		if not error:
			if check_str and type(r)!=str:
				print('обработчик строковой последовательности должен возвращать строку',file=sys.stderr)
				# игнорируем результат с неправильным обработчиком
			else:
				tmp_rezs.append((p,r))
		#print(tmp_rezs)
	return tmp_rezs

def _select_direct(patts,rezs):
	tmp_rezs = []
	for p,r in rezs:
		assert len(r) == len(patts)
		for i in range(len(patts)):
			if patts[i][0]=='direct':
				break
		else: raise Exception()
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
				raise Exception()
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
		else: raise Exception('неизвестный тип паттерна: '+str(t))
			
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
		raise Exception('неизветный тип последовательности: '\
							 +str((name,string_count,direct_count,obj_count)))
	
# reg_sequence ::=
#    name_modifier?
#    ( ( reg_symbol | `(` reg_alternatives`)` )
#       (simple_quantifier|complex_quantifier)?
#    )+
#    (seq_handler spcs)?;
@method(Parser)
@dwr
def p_reg_sequence(self,s,p,handlers=None):
	"""возвращет пару (тип, pp_функция)"""
	name = None
	patts = []
	if handlers==None: handlers = []
	
	p0 = p
	p,r = p_name_modifier(s,p)
	if not is_fatal(r):
		name = r
	else:
		tail_error.append((p,r))
		p = p0
		
	start_seq_p = p
	while True:
		errs = []
		p1 = p
		patt = None
		p,r = self.p_reg_symbol(s,p)
		if not is_fatal(r):
			patt = r
		else:
			errs.append((p,r))
			p = p1
			if p<len(s) and s[p]=='(':
				p+=1
				p2 = p
				p,r = self.p_reg_alternatives(s,p) # в дальнейшем p_reg_alternatives
				if is_fatal(r): 
					return p,r
				patt = r
				if not(p<len(s) and s[p]==')'):
					return (p,FatalError('ожидалась ")"'))
				p+=1
			else:
				errs.append((p,r))
				tail_error.append((p,FatalError(errs)))
				p = p1
				break
				
		p1 = p
		quant = None
		errs = []
		p,r = p_simple_quantifier(s,p)
		if not is_fatal(r):
			quant = r
		else:
			errs.append((p,r))
			p = p1
			p,r = p_complex_quantifier(s,p)
			if not is_fatal(r):
				quant = r
			else:
				errs.append((p,r))
				tail_error.append((p,FatalError(errs)))
				p = p1
				
		if quant == None:
			patts.append(patt)
		else:
			tmp = make_cycle(patt,quant)
			if debug:
				print('  '*depth,p,'make_cycle',tmp)
			patts.append(tmp)
			
	if len(patts)==0:
		return (start_seq_p,FatalError('последовательность не должна быть пустой'))
	
	p1 = p
	p,r = p_seq_handler(s,p)
	if is_fatal(r):
		tail_error.append((p,r))
		p = p1
	else:
		if len(handlers)>0:
			return (p,FatalError('повторное указывание обработчиков недопускается'))
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
@dwr
def p_bnf_sequence_(self,s,p,handlers = None):
	"""возвращет пару (тип, pp_функция)"""

	name = None
	patts = []
	if handlers==None: handlers = []
	
	p0 = p
	p,r = p_name_modifier(s,p)
	if not is_fatal(r):
		name = r
		p,r = p_spcs(s,p)
	else:
		tail_error.append((p,r))
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
			tail_error.append((p,r))
			p = p1
		
		errs = []
		p1 = p
		p,r = self.p_bnf_symbol(s,p)
		if not is_fatal(r):
			patt = r
			p,r = p_spcs(s,p)
		else:
			errs.append((p,r))
			p = p1
			if p<len(s) and s[p]=='(':
				p+=1
				p2 = p
				p,r = self.p_bnf_alternatives_(s,p) # в дальнейшем p_reg_alternatives
				if is_fatal(r): 
					return p,r
				patt = r
				if not(p<len(s) and s[p]==')'):
					return (p,FatalError('ожидалась ")"'))
				p+=1
				p,r = p_spcs(s,p)
			else:
				errs.append((p,r))
				tail_error.append((p,FatalError(errs)))
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
			tail_error.append((p,r))
			p = p1
		
		if quant == None:
			patts.append(patt)
		else:
			tmp = make_cycle(patt,quant)
			if debug:
				print('  '*depth,p,'make_cycle',tmp)
			patts.append(tmp)
			
	if len(patts)==0:
		return (start_seq_p,FatalError('последовательность не должна быть пустой'))
	
	p1 = p
	p,r = p_seq_handler(s,p)
	if is_fatal(r):
		tail_error.append((p,r))
		p = p1
	else:
		if len(handlers)>0:
			return (p,FatalError('повторное указывание обработчиков недопускается'))
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
				return [(p,[])]
			else:
				rezs = [(p,[r]) for p,r in rezs]
				rezs.append((p,[]))
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
					print('отбрасываем лишние варианты в цикле',p,file=sys.stderr)
				p = rezs[0][0]
				arr.append(rezs[0][1])
			i=i
			while maxim==-1 or i<maxim:
				rezs = pattern[1](s,p)
				if rezs==[]: 
					return [(p,arr)]
				if len(rezs)>1:
					print('отбрасываем лишние варианты в цикле',p,file=sys.stderr)
				if p==rezs[0][0]:
					print('последовательность нулевой длины в цикле:',p,file=sys.stderr)
					return [(p,arr)]
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
		return ('obj',pp_name)
	else: raise Exception()

	
# ---- Перечисления ----

def make_alternatives(seqs,handlers):
	direct_count = 0
	obj_count = 0
	string_count = 0
	for seq in seqs:
		if seq[0]=='direct': direct_count+=1
		elif seq[0]=='obj': obj_count+=1
		elif seq[0]=='string': string_count+=1
		else: raise Exception()
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
			return Elist(p0,FatalError(all_errs))
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
			return Elist(p0,all_errs)
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
	else: raise Exception()
	
# reg_alternatives ::= reg_sequence (`|` reg_sequence)*  alt_handler?
@method(Parser)
@dwr
def p_reg_alternatives(self,s,p,handlers = None):
	"""возвращет пару (тип, pp_функция)"""
	if handlers==None: handlers = []
	
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
	tail_error.append((p,FatalError('ожидался символ "|"')))
	
	p1 = p
	p,r = p_alt_handler(s,p)
	if not is_fatal(r):
		if len(handlers)>0:
			return (p,FatalError('повторное указывание обработчиков недопускается'))
		handlers.append(r)
	else:
		tail_error.append((p,r))
		p = p1

	if len(seqs)==1 and len(handlers)==0:
		return (p,seqs[0])
	return (p,make_alternatives(seqs,handlers))
	
# bnf_alternatives_ ::= bnf_sequence_ (`|` spcs bnf_sequence_)*  (alt_handler spcs)?
@method(Parser)
@dwr
def p_bnf_alternatives_(self,s,p,handlers = None):
	"""возвращет пару (тип, pp_функция)"""
	if handlers==None: handlers = []
	
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
	tail_error.append((p,FatalError('ожидался символ "|"')))

	p1 = p
	p,r = p_alt_handler(s,p)
	if not is_fatal(r):
		if len(handlers)>0:
			return (p,FatalError('повторное указывание обработчиков недопускается'))
		handlers.append(r)
		p,r = p_spcs(s,p)
	else:
		tail_error.append((p,r))
		p = p1

	if len(seqs)==1 and len(handlers)==0:
		return (p,seqs[0])
	return (p,make_alternatives(seqs,handlers))

	
# === Инициализация ===

def cache_debug(self,name):
	def decorator(fun):
		def wrapper(s,p):
			if not (s is self.cur_s):
				self.cur_s = s
				self.cache = {}
			if name not in self.cache:
				self.cache[name] = {}
			cache_name = self.cache[name]
			if p in cache_name:
				if self.trace_log:
					print('  '*self.depth,'^',name,p,'from_cache',repr(cache_name[p]))
				if cache_name[p]==None:
					print('зацикливание при левой рекурсии:',name,p,file=sys.stderr)
					return Elist(p,'зацикливание при левой рекурсии:'+name+str(p))
				else:
					return cache_name[p]
			else:
				cache_name[p] = None
				if self.trace_log:
					print('  '*self.depth,'{',name,p)
				
			self.depth+=1
			try:
				rezs=fun(s,p)   # <<<<<================== CALL FUN ======================
			finally:
				self.depth-=1
			if self.trace_log:
				print('  '*self.depth,'}')
				print('  '*self.depth,' ',name,p,repr(rezs))
				
			cache_name[p] = rezs
				
			return rezs
		return wrapper
	return decorator
	
def last_error(l):
	if len(l)==0: return []
	lp = max(p for p,e in l)
	return [(p,e) for p,e in l if p==lp]
	
@method(Parser)
def add_regexp(self,name,patt):
	cp = re.compile(patt)
	def pp_regexp(s,p):
		m = cp.match(s[p:])
		if m==None:
			return Elist(p,FatalError('ожидалось рег.выр. '+name))
		else:
			return [(p+len(m.group(0)),m.group(0))]
	self.patterns[name] = cache_debug(self,name)(pp_regexp)
	
@method(Parser)
def add_reg(self,name,patt):
	global tail_error
	tail_error = []
	p,r = self.p_reg_alternatives(patt,0)
	if is_fatal(r):
		raise Exception(r)
	tmp = r
	p,r = p_spcs(patt,p)
	if p!=len(patt):
		raise Exception('разобран не весь паттерн',p,patt[p:min(len(patt),p+20)])
	self.patterns[name] = cache_debug(self,name)(tmp[1])

@method(Parser)
def add_bnf(self,name,patt):
	global tail_error
	tail_error = []
	p=0
	p,r = p_spcs(patt,p)
	p,r = self.p_bnf_alternatives_(patt,p)
	if is_fatal(r):
		le = last_error(tail_error)
		if len(le)==0 or le[0][0]<=p:
			raise Exception((p,r))
		else: raise Exception(le)
	tmp = r
	if p!=len(patt):
		raise Exception(last_error(tail_error),p,patt[p:min(len(patt),p+20)])
	self.patterns[name] = cache_debug(self,name)(tmp[1])

@method(Parser)
def add_reg_seqfun(self,name,patt):
	def decorator(handler):
		global tail_error
		tail_error = []
		p,r = self.p_reg_sequence(patt,0,[handler])
		if is_fatal(r):
			raise Exception(r)
		tmp = r
		p,r = p_spcs(patt,p)
		if p!=len(patt):
			raise Exception('разобран не весь паттерн',p,patt[p:min(len(patt),p+20)])
		self.patterns[name] = cache_debug(self,name)(tmp[1])
	return decorator

@method(Parser)
def add_bnf_seqfun(self,name,patt):
	def decorator(handler):
		global tail_error
		tail_error = []
		p=0
		p,r = p_spcs(patt,p)
		p,r = self.p_bnf_sequence_(patt,p,[handler])
		if is_fatal(r):
			raise Exception(r)
		tmp = r
		p,r = p_spcs(patt,p)
		if p!=len(patt):
			raise Exception('разобран не весь паттерн',p,patt[p:min(len(patt),p+20)])
		self.patterns[name] = cache_debug(self,name)(tmp[1])
	return decorator

@method(Parser)
def add_reg_altfun(self,name,patt):
	def decorator(handler):
		global tail_error
		tail_error = []
		p,r = self.p_reg_alternatives(patt,0,[handler])
		if is_fatal(r):
			raise Exception(r)
		tmp = r
		p,r = p_spcs(patt,p)
		if p!=len(patt):
			raise Exception('разобран не весь паттерн',p,patt[p:min(len(patt),p+20)])
		self.patterns[name] = cache_debug(self,name)(tmp[1])
	return decorator

@method(Parser)
def add_bnf_altfun(self,name,patt):
	def decorator(handler):
		global tail_error
		tail_error = []
		p=0
		p,r = p_spcs(patt,p)
		p,r = self.p_bnf_alternatives_(patt,p,[handler])
		if is_fatal(r):
			raise Exception(r)
		tmp = r
		p,r = p_spcs(patt,p)
		if p!=len(patt):
			raise Exception('разобран не весь паттерн',p,patt[p:min(len(patt),p+20)])
		self.patterns[name] = cache_debug(self,name)(tmp[1])
	return decorator

