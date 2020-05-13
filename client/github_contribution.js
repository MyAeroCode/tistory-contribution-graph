// Author: bachvtuan@gmail.com
// Modified By Aerocode.

//Format string
if (!String.prototype.formatString) {
    String.prototype.formatString = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != "undefined" ? args[number] : match;
        });
    };
}

(function ($) {
    $.fn.github_graph = function (options) {
        //If the number less than 10, add Zero before it
        var prettyNumber = function (number) {
            return number < 10
                ? "0" + number.toString()
                : (number = number.toString());
        };

        /*
        Count the number on each day and store the object
        */
        var processListTimeStamp = function (list_timestamp) {
            //The result will store into this varriable
            obj_timestamp = {};
            for (var i = 0; i < list_timestamp.length; i++) {
                var _d = new Date(list_timestamp[i]);
                var display_date = getDisplayDate(_d);
                if (!obj_timestamp[display_date]) {
                    obj_timestamp[display_date] = 1;
                } else {
                    obj_timestamp[display_date]++;
                }
            }
        };

        var getDisplayDate = function (date_obj) {
            var pretty_month = prettyNumber(date_obj.getMonth() + 1);
            var pretty_date = prettyNumber(date_obj.getDate());
            return "{0}-{1}-{2}".formatString(
                date_obj.getFullYear(),
                pretty_month,
                pretty_date
            );
        };

        var getCount = function (display_date) {
            if (obj_timestamp[display_date]) {
                return obj_timestamp[display_date];
            }
            return 0;
        };

        var getColor = function (count) {
            if (count >= settings.colors.length) {
                return settings.colors[settings.colors.length - 1];
            }
            return settings.colors[count];
        };

        var start = function () {
            processListTimeStamp(settings.data);
            var wrap_chart = _this;

            settings.colors_length = settings.colors.length;

            var start_date = new Date();
            start_date.setMonth(start_date.getMonth() - 12);

            for (var i = 0; i < 7; i++) {
                var day = start_date.getDay();
                if (day == 0) {
                    //sunday
                    break;
                } else {
                    //Loop until get Sunday
                    start_date.setDate(start_date.getDate() + 1);
                }
            }

            var loop_html = "";

            //One year has 52 weeks
            var step = 14;

            var month_position = [];
            var current_date = new Date();
            month_position.push({ month_index: start_date.getMonth(), x: 0 });
            var using_month = start_date.getMonth();
            for (var i = 0; i < 52; i++) {
                var g_x = i * step;
                var item_html =
                    '<g transform="translate(' + g_x.toString() + ',0)">';

                for (var j = 0; j < 7; j++) {
                    if (start_date > current_date) {
                        //Break the loop
                        break;
                    }
                    var y = j * step;

                    var month_in_day = start_date.getMonth();
                    var data_date = getDisplayDate(start_date);
                    //Check first day in week
                    if (j == 0 && month_in_day != using_month) {
                        using_month = month_in_day;
                        month_position.push({
                            month_index: using_month,
                            x: g_x,
                        });
                    }
                    //move on to next day
                    start_date.setDate(start_date.getDate() + 1);
                    var count = getCount(data_date);
                    var color = getColor(count);

                    item_html += `<rect class="day" width="${12}" height="${12}" y="${y}" fill="${color}" data-count="${count}" data-date="${data_date}" /> `;
                }

                item_html += "</g>";

                loop_html += item_html;
            }

            //trick
            if (month_position[1].x - month_position[0].x < 40) {
                //Fix ugly graph by remove first item
                month_position.shift(0);
            }

            for (var i = 0; i < month_position.length; i++) {
                var item = month_position[i];
                var month_name = settings.month_names[item.month_index];
                loop_html +=
                    '<text x="' +
                    item.x +
                    '" y="-5" class="month">' +
                    month_name +
                    "</text>";
            }

            //Add Monday, Wenesday, Friday label
            loop_html +=
                '<text text-anchor="middle" class="wday" dx="-10" dy="24">{0}</text>'.formatString(
                    settings.h_days[0]
                ) +
                '<text text-anchor="middle" class="wday" dx="-10" dy="53">{0}</text>'.formatString(
                    settings.h_days[1]
                ) +
                '<text text-anchor="middle" class="wday" dx="-10" dy="80">{0}</text>'.formatString(
                    settings.h_days[2]
                );

            function numberWithCommas(x) {
                return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            }

            //Fixed size for now with width= 721 and height = 110
            const cx = 0;
            var wire_html = `
                <div id="graph-header">
                    ${numberWithCommas(
                        cx
                        // settings.data.length
                    )} 
                    ${cx <= 1 ? "post" : "posts"} in the last year
                </div>
                <div id="graph-border">
                    
                    <div id="graph-holder">
                        <svg width="755px" height="128px" class="js-calendar-graph-svg">
                            <g transform="translate(26, 26)">
                                ${loop_html}
                            </g>
                        </svg>
                    </div>
                    <div class="contrib-footer clearfix mt-1 mx-3 px-3 pb-1">
                        <div class="footer-how-count">
                            <a href="https://help.github.com/articles/why-are-my-contributions-not-showing-up-on-my-profile" target="_blank" class="">
                                Learn how we count contributions</a>.
                            </div>
                        <div class="contrib-legend text-gray" title="블로그에 작성한 게시글 개수를 의미합니다.">
                        Less
                        <ul class="legend">
                            <li style="background-color: #ebedf0"></li>
                            <li style="background-color: #c6e48b"></li>
                            <li style="background-color: #7bc96f"></li>
                            <li style="background-color: #239a3b"></li>
                            <li style="background-color: #196127"></li>
                        </ul>
                        More
                    </div>
                </div>
            `;

            wrap_chart.html(wire_html);

            //Mare sure off previous event
            /*$(document).off('mouseenter', _this.find('rect'), mouseEnter );
          $(document).off('mouseleave', _this.find('rect'), mouseLeave );
          $(document).on('mouseenter', _this.find('rect'), mouseEnter );
          $(document).on('mouseleave', _this.find('rect'), mouseLeave );
*/
            _this.find("rect").on("mouseenter", mouseEnter);
            _this.find("rect").on("mouseleave", mouseLeave);
            appendTooltip();
        };

        var mouseLeave = function (evt) {
            $(".svg-tip").hide();
        };

        //handle event mouseenter when enter into rect element
        var mouseEnter = function (evt) {
            var target_offset = $(evt.target).offset();
            var count = $(evt.target).attr("data-count");
            var date = $(evt.target).attr("data-date");

            var count_text = count != 1 ? settings.texts[1] : settings.texts[0];
            var text = "{0} {1} on {2}".formatString(count, count_text, date);

            var svg_tip = $(".svg-tip").show();
            svg_tip.html(text);
            var svg_width = Math.round(svg_tip.width() / 2 + 5);
            var svg_height = svg_tip.height() * 2 + 10;

            svg_tip.css({ top: target_offset.top - svg_height - 5 });
            svg_tip.css({ left: target_offset.left - svg_width });
        };
        //Append tooltip to display when mouse enter the rect element
        //Default is display:none
        var appendTooltip = function () {
            if ($(".svg-tip").length == 0) {
                $("body").append(
                    '<div class="svg-tip svg-tip-one-line" style="display:none" ></div>'
                );
            }
        };

        var settings = $.extend(
            {
                //Default init settings.colors, user can override
                colors: ["#eeeeee", "#d6e685", "#8cc665", "#44a340", "#44a340"],

                //List of name months
                month_names: [
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                ],
                h_days: ["M", "W", "F"],

                //Default is empty, it can be overrided
                data: [],
            },
            options
        );

        var _this = $(this);

        start();
    };
})(jQuery);
