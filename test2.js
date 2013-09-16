$(function()
{
    $(document).fsTpl.cvtr['durationToTime'] = function(value) {
        var time = '';
        var isFirst = true;
        while (value) {
            if (!isFirst) {
                time = ':' + time;
            }
            var lVal = value % 60;
            time = ((lVal < 10) ? '0' : '') + (lVal).toString() + time;
            
            value = Math.floor(value / 60);
            isFirst = false;
        }
        return time;
    };
    
    $.post(
        'ajax.php', 
        {action:'getArtist2', template:true},
        function(data){
            //Store template in TemplateManager
            $('#content').html($(data.template).fsTpl(data.datas, {template:'variableReplace'}));
        },
        "json"
    );
});
