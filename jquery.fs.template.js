(function($)
{
    var defaultConfig = {
        prefix: 'fs_',
        template: 'normal'
    };
    
    var mergeObject = function(obj1, obj2)
    {
        for (var i in obj2) {
            obj1[i] = obj2[i];
        }
        return obj1;
    };
    /*
    var getTpl1 = function(element, options) {
        var tplList = element.find("[class^='" + options.prefix + "'],[class*=' " + options.prefix + "']");
        var currParent = null;
        
        tplList.each(function(index, item) {
            //this == tplList ?
            var that = tplList[index];
            
            var classList = item.attr('class').split(/\s+/);
            var tplName;
            $.each(classList, function(ind, className) {
               
                var lClassName = className.substr(0, options.prefix.length);
                if (lClassName === options.prefix) {
                    tplName = lClassName;
                    return false;
                } 
            });
            if (currParent === null) {
                //checker parent en recursion inverse et ordonner les tpl en hierarchy a defaut du find first level
            }
        });
    };
    */
    var getClassName = function(element, options) {
        var lClass = $(element).attr('class');
        if (!lClass) {
            return null;
        }
        var classList = lClass.split(/\s+/);
        var returnClass = null;
        $.each(classList, function(index, className) {

            var lClassName = className.substr(0, options.prefix.length);
            if (lClassName === options.prefix) {
                returnClass = className;
                return false;
            } 
        });
        return returnClass;
    };
    
    var getTpl2 = function(element, options, list) {
        if (list === undefined) {
            list = {};

            var className = getClassName(element, options);
            if (className) {
                var shortName = className.substr(options.prefix.length);
                list[shortName] = {tpl:$(element), child:{}};
                return getTpl2($(element), options, list[shortName].child);
            }
        }
        var child = $(element).children();
        child.each(function(index, item) {
            var className = getClassName(item, options);
            if (className) {
                var shortName = className.substr(options.prefix.length);
                list[shortName] = {tpl:$(item), child:{}};
                getTpl2($(item), options, list[shortName].child);
            } else {
                getTpl2($(item), options, list);
            }
        });
        return list;
    }
    
    var applyTpl2 = function(tplList, args, config) {
        for (var i in tplList) {
            if (args[i] === undefined) {
                tplList[i].tpl.remove();//Remove this child if unused
            } else if (args[i] instanceof Array) {
                var lArgs = args[i];
                for (var ind = 0; ind < lArgs.length; ++ind) {
                    var lArg = lArgs[ind];
                    var lClone = tplList[i].tpl.clone();
                    tplList[i].tpl.after(lClone);//Insert after this element ?
                    applyTpl2(getTpl2(lClone, config), lArg, config);
                }
                tplList[i].tpl.remove();
            } else if (args[i] instanceof Object) {//converter if is object) {
                var lArg = args[i];
                if (lArg['value'] === undefined) {
                    continue;
                }
                if (lArg['converter'] !== undefined) {
                    tplList[i].tpl.html(converters[lArg['converter']](lArg['value']));
                } else {
                    tplList[i].tpl.html(lArg['value']);
                }
            }else {
                tplList[i].tpl.html(args[i]);
            }
        }
    };
    
    
    var recureParseVariablesVariableReplace = function(matches) {
        var variables = {array:[], variables:{}};
        var currVariables = {};
        
        for (var i = 0; i < matches.length; ++i) {
            var match = matches[i];
            var variable = match.substr(1, match.length - 2);
            if (variable.charAt(0) === '$') {
                var name = variable.substr(1);
                if (variables.variables[name] === undefined) {
                    currVariables[name] = variables.variables[name] = {value:match, type:'variable'};
                } else {
                    currVariables[name] = variables.variables[name] = mergeObject(variables.variables[name], {value:match, type:'variable'});
                }
            } else {
                var parts = variable.split(':');
                if (parts.length !== 2 || parts[1].charAt(0) !== '$') {
                    continue;
                }
                if (parts[0] === 'array') {
                    var searchEnd = '{/' + variable + '}';
                    var countRecursive = 0;//Check if pattern element is not in it-self
                    for (var j = i + 1; j < matches.length; ++j) {
                        if (matches[j] === match) {
                            ++countRecursive;
                        } else if (matches[j] === searchEnd) {
                            if (countRecursive > 0) {
                                --countRecursive;
                            } else {
                                var child = {name:parts[1].substr(1), variable:{type:'array', value:match, valueEnd:searchEnd, child:recureParseVariablesVariableReplace(matches.splice(i + 1, j - i - 1))}};
                                if (currVariables[name] !== undefined) {
                                    child = mergeObject(child, currVariables[name]);
                                    delete variables.variables[name];
                                }
                                variables.array.push(child);
                                currVariables[name] = child;
                                matches.splice(i, 1);
                                break;
                            }
                        }
                    }
                } else if (parts[0] === 'isset') {//TODO: {isset:$var}{/isset:$var}. if args[$var] doesn't exit, remove block, if exist keep variables context.
                    var name = parts[1].substr(1);
                    if (currVariables[name] === undefined) {
                        currVariables[name] = variables.variables[name] = {isset:{value:match, valueEnd:'{/' + variable + '}'}};
                    } else {
                        currVariables[name]['isset'] = {value:match, valueEnd:'{/' + variable + '}'};
                    }
                    //Remove {/isset:$var} from matches;
                } else if (parts[0] === 'empty') {//TODO: {empty:$var}{/empty:$var}. if args[$var] doesn't exit, use this block and keep variables context.
                    var name = parts[1].substr(1);
                    if (currVariables[name] === undefined) {
                        currVariables[name] = variables.variables[name] = {empty:{value:match, valueEnd:'{/' + variable + '}'}};
                    } else {
                        currVariables[name]['empty'] = {value:match, valueEnd:'{/' + variable + '}'};
                    }
                    //Remove {/empty:$var} from matches;
                } else if (parts[0] === 'count'){//TODO: {count:$var}. if args[$var] doesn't exit, replace by 0. Count array.
                    var name = parts[1].substr(1);
                    if (currVariables[name] === undefined) {
                        currVariables[name] = variables.variables[name] = {count:{value:match}};
                    } else {
                        currVariables[name]['count'] = {value:match};
                    }
                }
            }
        }
        return variables;
    };
    var parseTemplateVariableReplace = function(template) {
        var matches = template.match(/\{(.+?)\}/g);
        return recureParseVariablesVariableReplace(matches);
    };
    
    var applyTplVariableReplace = function(template, args, variables, options) {
        for (var i = 0; i < variables.array.length; ++i) {
            var variable = variables.array[i];
            var start = template.indexOf(variable.variable.value);
            var end = template.indexOf(variable.variable.valueEnd, end) + variable.variable.valueEnd.length;
            var isNull = false;
            var count = 0;
            //Add empty/isset check
            if (args[variable.name] === undefined) {
                template = template.substr(start, end);
                isNull = true;
            } else {
                var tpl1 = template.substr(0, start);
                var tpl = template.substring(start + variable.variable.value.length, end - variable.variable.valueEnd.length);
                var tpl2 = template.substr(end);
                var lArg = args[variable.name];
                template = '';
                var variablesChild = variable.variable.child;
                count = lArg.length;
                for (var ind = 0; ind < lArg.length; ++ind) {
                    template += applyTplVariableReplace(tpl, lArg[ind], variablesChild, options);
                }
                isNull = (template === '');
                template = tpl1 + template + tpl2;
            }
            if (isNull) {
                if (variable['empty'] !== undefined) {
                    var lEmpty = variable['empty'];
                    template = template.split(lEmpty.value).join('').split(lEmpty.valueEnd).join('');
                }
                if (variable['isset'] !== undefined) {
                    var lIsset = variable['isset'];
                    template = template.substr(0, template.indexOf(lIsset.value)) + template.substr(template.indexOf(lIsset.valueEnd) + lIsset.valueEnd.length);
                }
            } else {
                if (variable['empty'] !== undefined) {
                    var lEmpty = variable['empty'];
                    template = template.substr(0, template.indexOf(lEmpty.value)) + template.substr(template.indexOf(lEmpty.valueEnd) + lEmpty.valueEnd.length);
                }
                if (variable['isset'] !== undefined) {
                    var lIsset = variable['isset'];
                    template = template.split(lIsset.value).join('').split(lIsset.valueEnd).join('');
                }
            }
            if (variable['count'] !== undefined) {
                template = template.split(variable.count.value).join(count);
            }
        }
        for (var i in variables.variables) {
            var variable = variables.variables[i];
            var value;
            var lArg = args[i];
            //Add empty/isset check
            if (lArg === undefined) {
                value = null;
            } else {
                if (lArg instanceof Object) {
                    if (lArg['value'] === undefined) {
                        value = null;
                    } else if (lArg['converter'] !== undefined) {
                        value = converters[lArg['converter']](lArg['value']);
                    } else {
                        value = lArg['value'];
                    }
                } else {
                    value = lArg;
                }
            }
            
            if (value === null) {
                if (variable['empty'] !== undefined) {
                    var lEmpty = variable['empty'];
                    template = template.split(lEmpty.value).join('').split(lEmpty.valueEnd).join('');
                }
                if (variable['isset'] !== undefined) {
                    var lIsset = variable['isset'];
                    template = template.substr(0, template.indexOf(lIsset.value)) + template.substr(template.indexOf(lIsset.valueEnd) + lIsset.valueEnd.length);
                    continue;
                }
                value = '';
            } else {
                if (variable['isset'] !== undefined) {
                    var lIsset = variable['isset'];
                    template = template.split(lIsset.value).join('').split(lIsset.valueEnd).join('');
                }
                if (variable['empty'] !== undefined) {
                    var lEmpty = variable['empty'];
                    template = template.substr(0, template.indexOf(lEmpty.value)) + template.substr(template.indexOf(lEmpty.valueEnd) + lEmpty.valueEnd.length);
                }
            }
            
            template = template.split(variable.value).join(value);
        }
        return template;
    };
    
    var templateMode = {
        normal: function(template, args, options) {
            var tplList = getTpl2(template, options);
            applyTpl2(tplList, args, options);
            return template;
        },
        variableReplace: function(template, args, options) {
            template = template[0].outerHTML;
            var variables = parseTemplateVariableReplace(template);
            console.log(variables);
            console.log(args);
            return applyTplVariableReplace(template, args, variables, options);
        }
    };
    
    $.fn.fsTpl = function(args, config)
    {
        if (config === undefined) {
            config = {};
        }
        
        var options = mergeObject(mergeObject({}, defaultConfig), config);
        var clone = $(this).clone();

        return templateMode[options.template](clone, args, options);
    };
    
    var converters = $.fn.fsTpl.converters = $.fn.fsTpl.cvtr = {};
        
})(jQuery);