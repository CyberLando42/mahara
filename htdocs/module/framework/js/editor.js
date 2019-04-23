/**
 * Javascript for the SmartEvidence editor
 * Mahara implementation of third party plugin - https://github.com/json-editor/json-editor
 *
 * @package    mahara
 * @subpackage core
 * @author     Catalyst IT Ltd
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL version 3 or later
 * @copyright  For copyright information on Mahara, please see the README file distributed with this software.
 *
 */
/*
 * Some wishlist functionality to be implemented later than 19.04:
 * 1 @TODO - Make preview button work
 *   It should show what current framework looks like as the left column of the SmartEvidence map -
 *   i.e. what you see when you look at the first page of a SE collection
 * 2 @TODO - Turn edit overall form option into an export json button and have it create a file.matrix
 *   for sharing.  (Note that in the custom code patch 5accb2c9d1259005249248d5cb4f2fa8acba97b5,
 *   there is code that re-names the button, which is there for this function.)
 *  * - do we want this:
 *   Clicking the "Save" button keeps you on the form and you have to click "Cancel" to return to the overview -> Implement the Moodle "Save" -
 * "Save and return to overview" - "Cancel"?
 * - Maybe: Add third-level nav to management screen of a framework? But then what to call the nav item? Overview wouldn't work,
 *  would be better to then call it "Management".
 */
/*
 * Functionality still to be implemented by 19.04:
 * @TODO - review:
 *  - make sub-sub elements work
 * - eid increments correctly  - make update_eid function work
 * check copy save
 * add inst default in the php.
 */

jQuery(function($) {
    //use bootstrap
    JSONEditor.defaults.options.theme = 'bootstrap4';
    //Hide edit json buttons. @TODO - main one will be needed for #2 wishlist item above
    JSONEditor.defaults.options.disable_edit_json = 'true';

    //Override default editor strings to allow translation by us
    // - fyi, not all editor strings are overridden, just the ones currently used.
    // - The original editor defaults in htdocs/js/jsoneditor/src/defaults.js
    JSONEditor.defaults.languages.en.button_collapse = get_string('collapse');
    JSONEditor.defaults.languages.en.button_expand = get_string('expand');
    JSONEditor.defaults.languages.en.button_add_row_title = get_string('add');
    JSONEditor.defaults.languages.en.button_delete_last_title = get_string('deletelast') + " {{0}}";
    JSONEditor.defaults.languages.en.button_move_down_title = get_string('moveright');//Move right
    JSONEditor.defaults.languages.en.button_move_up_title = get_string('moveleft');
    JSONEditor.defaults.languages.en.button_delete_all_title = get_string('deleteall');

    //enable select2
    JSONEditor.plugins.select2.enable = true;

    var editor;
    var parent_array = [''];

    //counts to increment standard and standardelement ids
    var std_index = 0;
    var standard_count = 1;

    var eid = 1;//count of standard elements per standard
    var se_index = 0; //index of total standard elements

    var fw_id = null; //framework id if editing an existing framework
    var edit = false; //flag for edit vs. copy
    //constant identifiers for json schema
    var evidence_type = ['begun' ,'incomplete', 'partialcomplete', 'completed'];

    formchangemanager.add('editor_holder');

    /*
    * Jquery functionality outside the json-editor form:
    * includes dropdowns for edit, copy and the cancel, save and preview buttons
    * templated by theme/raw/plugintype/module/framework/templates/jsoneditor.tpl
    */

    //edit dropdown
    $('#edit').on('change',function() {
        var confirm = null;
        if (typeof formchangemanager !== 'undefined') {
            confirm = formchangemanager.confirmLeavingForm();
        }
        if (confirm === null || confirm === true) {

            //rebuild the form so that data doesn't get added to existing
            editor.destroy();
            refresh_editor();
            $("#copy option:eq(0)").prop('selected', true);//reset copy
            edit = true;
            var index = $('#edit').val();
            populate_editor(index, edit);

            upload = false;
            textarea_init();
            set_editor_clean();
        }
    });

    //copy dropdown.
    $("#copy").on('change', function() {
        var confirm = null;
        if (typeof formchangemanager !== 'undefined') {
            confirm = formchangemanager.confirmLeavingForm();
        }
        if (confirm === null || confirm === true) {

            //rebuild the form so that data doesn't get added to existing
            if (formchangemanager.checkDirtyChanges()) {
                formchangemanager.confirmLeavingForm();
            }
            editor.destroy();
            refresh_editor();
            $("#edit option:eq(0)").prop('selected', true); //reset edit
            edit = false;
            var index = $('#copy').val();
            populate_editor(index);
            textarea_init();
            set_editor_clean();
        }
    });

    // Cancel button - goes to overview screen
    $(".cancel").click(function() {
        formchangemanager.setFormStateById('editor_holder', FORM_CANCELLED);
        window.location.href = config['wwwroot'] + 'module/framework/frameworks.php';
    });

    // hide currently inactive preview button - @TODO - needed for #1 wishlist item above
    $('#preview').hide();

    // Hook up the submit button to log to the console
    $(".submit").click(function() {
        formchangemanager.setFormStateById('editor_holder', FORM_SUBMITTED);
        // Get all the form's values from the editor
        var json_form = editor.getValue();
        url = config['wwwroot'] + 'module/framework/framework.json.php';
        //if framework id is set, we are editing an existing framework
        if (fw_id) {
            json_form.fw_id = fw_id;
        }
        //save completed form data
        sendjsonrequest(url, json_form, 'POST');
        window.scrollTo(0,0);
    });//end of functionality implemented outside the editor

    refresh_editor();

    /**
     * Initialise the editor
     *  - set the json-schema for the form
     *  - add events to form elements
     *  - call initialising functions
     */
    function refresh_editor() {

        editor = new JSONEditor(document.getElementById('editor_holder'), {
        //json-editor properties
        ajax: true,
        disable_properties : true,
        show_errors: "always",
        // The schema for the editor, info on https://github.com/json-editor/json-editor
        schema: {
            "title": get_string('Framework'),
            "type": "object",
            "properties": {
                "institution": {
                    "type" : "string",
                    "title" : get_string('institution'),
                    "description" : get_string('instdescription'),
                    "id" : "inst_desc",
                    "enum" : inst_names.split(','),
                    "default" : get_string('all')
                },
                "name": {
                    "type" : "string",
                    "title" : get_string('name'),
                    "description": get_string('titledesc'),
                    "default" : get_string('frameworktitle'),
                },
                "description" : {
                    "type" : "string",
                    "title" : get_string('description'),
                    "format" : "textarea",
                    "default" : get_string('defaultdescription'),
                    "description" : get_string('descriptioninfo')
                },
                "selfassess" : {
                    "type" : "boolean",
                    "title" : get_string('selfassessed'),
                    "description" : get_string('selfassesseddescription'),
                    "default" : false,
                    "options" : {
                        "enum_titles" : [get_string('yes'), get_string('no')]
                    }
                },
                "evidencestatuses":{
                "title": get_string('evidencestatuses'),
                "id" : "evidencestatuses",
                "type" : "object",
                "options" : {
                    "disable_array_reorder" : true,
                    "disable_edit_json" : true,
                    "disable_collapse" : true
                },
                "description": get_string('evidencedesc'),
                "properties": {
                    "begun": {
                        "title" : get_string('Begun'),
                        "type" : "string",
                        "default" : get_string('begun'),
                        "propertyOrder" : 1
                    },
                    "incomplete": {
                        "title" : get_string('Incomplete'),
                        "type" : "string",
                        "default" : get_string('incomplete'),
                        "propertyOrder" : 2
                    },
                    "partialcomplete": {
                        "title" : get_string('Partialcomplete'),
                        "type" : "string",
                        "default" : get_string('partialcomplete'),
                        "propertyOrder" : 3
                    },
                    "completed": {
                        "title" : get_string('Completed'),
                        "type" : "string",
                        "default" : get_string('completed'),
                        "propertyOrder" : 4
                    }
                }
                },
                "standards" : {
                    "title" : get_string('standards'),
                    "type" : "array",
                    "id" : "standards",
                    "format" : "tabs-top",
                    "minItems":1,
                    "description" : get_string('standardsdescription'),
                    "items" : {
                        "title" : get_string('standard'),
                        "headerTemplate" : "{{i1}} - {{self.shortname}}",
                        "type" : "object",
                        "id" : "standard",
                        "options" : {
                            "disable_collapse" : true
                        },
                        "properties" : {
                            "shortname" : {
                                "type" : "string",
                                "title" : get_string('Shortname'),
                                "description" : get_string('shortnamestandard'),
                                "default" : get_string('Shortname'),
                                "maxLength" : 100
                            },
                            "name" : {
                                "type" : "string",
                                "title" : get_string('name'),
                                "description" : get_string('titlestandard'),
                                "format" : "textarea",
                                "maxLength" : 255
                            },
                            "description" : {
                                "type" : "string",
                                "title" : get_string('description'),
                                "format" : "textarea",
                                "default" : get_string('descstandarddefault'),
                                "description" : get_string('descstandard')
                            },
                            "standardid" : {
                                "type" : "number",
                                "title" : get_string('standardid'),
                                "default" : "1",
                                "description" : get_string('standardiddesc')
                            },
                            "uid" : {
                                "type" : "number",
                                "default" : null,
                                "options" : {
                                    "hidden" : true
                                }
                            }
                        }
                    }
                },
                "standardelements" : {
                    "title" : get_string('standardelements'),
                    "id" : "standardelements",
                    "type" : "array",
                    "uniqueItems" : true,
                    "minItems":1,
                    "format" : "tabs-top",
                    "description" : get_string('standardelementsdescription', 'module.framework'),
                    "items" : {
                        "title" : get_string('standardelement'),
                        "headerTemplate" : "{{self.elementid}}",
                        "type" : "object",
                        "id" : "standardelement",
                        "options" : {
                            "disable_collapse" : true
                        },
                        "properties" : {
                            "shortname" : {
                                "type" : "string",
                                "title" : get_string('Shortname'),
                                "description" : get_string('shortnamestandard'),
                                "maxLength" : 100
                            },
                            "name" : {
                                "type" : "string",
                                "title" : get_string('name'),
                                "description" : get_string('titlestandard'),
                                "format" : "textarea",
                                "maxLength" : 255
                            },
                            "description" : {
                                "type" : "string",
                                "title" : get_string('description'),
                                "format" : "textarea",
                                "default" : get_string('standardelementdefault'),
                                "description" : get_string('standardelementdesc')
                            },
                            "elementid" : {
                                "type" : "string",
                                "title" : get_string('elementid'),
                                "default" : '1.1',
                                "description" : get_string('elementiddesc')
                            },
                            "parentelementid" : {
                                "title" : get_string('parentelementid'),
                                "id" : "parentid",
                                "type" : "string",
                                "description" : get_string('parentelementdesc'),
                                "enumSource" : "source",
                                "watch" : {
                                    "source" : "pid_array"
                                },
                            },
                            "pid_array" : {
                                "id" : "hidden_pid_array",
                                "type" : "array",
                                "items" : {
                                    "enum" : parent_array,
                                },
                                "options" : {
                                    "hidden" : true,
                                },
                            },
                            "uid" : {
                                "type" : "number",
                                "default" : null,
                                "options" : {
                                    "hidden" : true
                                }
                            }
                        }
                    }
                }
            }
        },
        });
        //add ids to things so we can call them more easily later.
        $('div[data-schemaid="standards"] > h3 > div > button.json-editor-btn-add').attr("id", "add_standard");
        $('div[data-schemaid="standardelements"] > h3 > div > button.json-editor-btn-add').attr("id", "add_standardelement");
        //creating ids for adding wysiwyg - not currently active: @TODO
        $('div[data-schemapath="root.description"] > div > textarea').attr("id", "title_desc_textarea");
        $('div[data-schemaid="standards"] textarea[data-schemaformat="textarea"]').each(function(){
            var schemapath = $(this).closest('div[data-schemapath]').attr('data-schemapath').split('.');
            var standardid = schemapath[2];
            $(this).attr("id", "std_" +standardid + "_" + schemapath[3] + "_textarea");

        })

        $('div[data-schemaid="standardelements"] textarea[data-schemaformat="textarea"]').each(function(){
            var schemapath = $(this).closest('div[data-schemapath]').attr('data-schemapath').split('.');
            var standardelementid = schemapath[2];
            $(this).attr("id", "std_element_" + standardelementid + "_" + schemapath[3] + "_textarea");
        })
        //make text same as rest of site
        $("div.form-group p.form-text").addClass("description");
        $("div.form-group form-control-label").addClass("label");
        //add class for correct styling of help block text
        $('[data-schemaid="standards"] > p').addClass("help-block");
        $('[data-schemaid="evidencestatuses"] > p').addClass("help-block");
        //set min row height for desc fields to 6
        $("textarea[id$='_description_textarea']").attr('rows', '6');
        textarea_init();
        update_parent_array();
        set_parent_array();
        add_parent_event();

        update_delete_button_handler();
        update_delete_element_button_handlers();

        $("#add_standard").click(function() {
            standard_count += 1;
            std_index = standard_count -1;
            var sid_field = editor.getEditor("root.standards." + std_index + ".standardid");
            sid_field.setValue(standard_count);
            var se_sid_field = editor.getEditor("root.standardelements." + se_index + ".standardid");
            if (se_sid_field) {
                se_sid_field.setValue(standard_count);
            }
            //reset standard element count
            eid = 0;
            update_parent_array();
            set_parent_array();
            textarea_init();
            set_editor_dirty();
        });
        $("#add_standardelement").click(function() {
          // update delete button handlers
          update_delete_element_button_handlers();
          se_index = parent_array.length;

            var eid_field = editor.getEditor("root.standardelements." + se_index + ".elementid");
            var eid_val;
            if (!standard_count) {
                eid_val = "1." + eid;
                }
            else {
                eid ++;
                eid_val = standard_count + "." + eid;
            }
            eid_field.setValue(eid_val);
            update_parent_array();
            set_parent_array();
            add_parent_event();
            textarea_init();
            set_editor_dirty();
        });

        // add checks to monitor if fields are changed
        editor.on('ready', function () {
            set_editor_clean();
            $('#editor_holder textarea').each(function(el){
              $(this).on('change', function() {
                  set_editor_dirty();
              });
            });
            $('#editor_holder input').each(function(el){
              $(this).on('change', function() {
                  set_editor_dirty()
              });
            });
            $('#editor_holder select').each(function(el){
              $(this).on('change', function() {
                  set_editor_dirty()
              });
            });
        });

        // validation indicator
        editor.off('change');
        editor.on('change',function() {
            //@TODO, check functionality
            // Get an array of errors from the validator
            var errors = editor.validate();
            // Not valid
            if (errors.length) {
                $('#messages').empty().append($('<div>', {'class':'alert alert-danger', 'text':get_string('invalidjsonineditor', 'module.framework')}));
            }
            // Valid
            else {
                $('#messages').empty().append($('<div>', {'class':'alert alert-success', 'text':get_string('validjson')}));
            }
        });

    }//end of refresh function

    /**
     * Populate the editor from database
     *  @param framework_id The db id for the framework
     *  @param edit boolean, true if editing an existing framework
     */

    function populate_editor(framework_id, edit) {
        url = config['wwwroot'] + 'module/framework/getframework.json.php';
        upload = true;
        //get data from existing framework
        sendjsonrequest(url, {'framework_id': framework_id} , 'POST', function(data) {
            if (edit) {
                fw_id = data.data.title.id;
            }
            //set the values for the first 'title' section
            $.each(data.data.title, function (k, value) {
                if (k === 'selfassess') {
                    if (value == 1) {
                        value = true;
                    }
                    else {
                        value = false;
                    }
                var ed = editor.getEditor("root." + k);
                ed.setValue(value);
                }
                var ed = editor.getEditor("root." + k);
                if (ed) {
                    if (k === 'description') {
                        textarea_init();
                        ed.setValue(value)
                        //@TODO wysiwyg editing of description fields
                    }
                    else {
                        ed.setValue(value);
                    }
                }
            });
            //set the values for the evidence statuses
            $.each(data.data.evidencestatuses, function (k, value) {
                var type = evidence_type[value.type];
                var es = editor.getEditor("root.evidencestatuses." + type);
                es.setValue(value.name);
            });
            var std_nums = new Array();
            //set the values for the standards
            $.each(data.data.standards, function (k, value) {
                //k is standard index or 'element'
                if (k != 'element') {
                    std_index = parseInt(k);
                }
                //if the standard doesn't already exist, we need to add it to the editor.
                if (std_index > 0 && !editor.getEditor("root.standards." + std_index)) {
                    var std_ed = editor.getEditor("root.standards");
                    std_ed.addRow();
                    standard_count += 1;
                    textarea_init();
                }
                //this makes an array with the 0 index empty and the db std ids matched with the index
                //of their standard number.
                standard_count = std_index + 1;
                if (value.id) {
                    std_nums[standard_count] = value.id;
                }

                $.each(value, function(k, val) {
                    //this works where the data field name is the same as the DOM's id
                    var field = editor.getEditor("root.standards." + std_index + "." + k );
                    if (field) {
                        field.setValue(val);
                    }
                    //the standardid is called priority in the db
                    if (k === "priority") {
                        //priority count for standards starts from 0
                        val = parseInt(val) + 1;
                        field = editor.getEditor("root.standards." + std_index + "." + "standardid");
                        if (field) {
                            field.setValue(val);
                        }
                    }
                    //this is the db id, which we need to track if this is an edit
                    if (k === "id") {
                        field = editor.getEditor("root.standards." + std_index + "." + "uid");
                        if (field) {
                            field.setValue(val);
                        }
                    }
                });
            });
            //first 'each' is all the standard elements associated with a standard
            $.each(data.data.standards.element, function (k, value) {
                var se_array = value;
                //convert the absolute standard id from the db to the local standard id
                //for this framework
                var std_id = value[0].standard;
                var se_val = 0;
                var subel_val = 0
                standard_count = std_nums.indexOf(std_id); //the sid in the editor
                var pid_val = 0;
                var eid_field;
                var pid_field;
                var eid_val;
                //each standard element
                $.each(se_array, function (k, value){
                    //add a row for each new standard element
                    var se = editor.getEditor("root.standardelements");
                    if (se_index > 0) {
                        se.addRow();
                        update_parent_array();
                        textarea_init();
                        add_parent_event();
                    }
                    //each value from a standard element
                    $.each(value, function (k,value ) {
                        //set if exists - works for shortname, name and description
                        var se = editor.getEditor("root.standardelements." + se_index + "." + k);
                        if (se) {
                            se.setValue(value);
                        }
                        //priority is elementid in the editor
                        //if there is no parentid, we just set the element id with the priority
                        if (k === "priority") {
                            if (eid_field) {
                            eid_val = value;
                            eid++;
                            }
                        }
                        if (k === "parent" ) {
                            if (value == null) {
                                //anything after this will have a new parent, so increment parent value
                                se_val++;
                                //this is also the element id if there is no parent
                                eid_val = se_val;
                                //reset the count of element ids for sub elements of this standard element
                                subel_val = 0;
                            }
                            //there is a parent element, we need to handle it
                            else {
                                subel_val++;
                                eid_val = subel_val;
                                pid_val = se_val;
                            }
                        }
                            //this is the db id, which we need to track if this is an edit or if parentids are used
                        if (k === "id") {
                            field = editor.getEditor("root.standardelements." + se_index + "." + "uid");
                            if (field) {
                                field.setValue(value);
                            }
                        }
                    });
                    //since pid_val and eid_val depend on each other, we need to set them outside the loop.
                    pid_field = editor.getEditor("root.standardelements." + se_index + ".parentelementid");
                    eid_field = editor.getEditor("root.standardelements." + se_index + "." + "elementid");
                    if (pid_val && eid_field) {
                        eid_field.setValue(standard_count + "." + pid_val + "." + eid_val);
                        pid_field.setValue(standard_count + "." + pid_val);
                    }
                    else if (eid_field) {
                        eid_field.setValue(standard_count + "." + eid_val);
                    }
                    pid_val = null;
                    se_index ++;
                    eid = eid_val;
                });
            });
            update_parent_array();
            set_parent_array();

            update_delete_element_button_handlers();
          });
    }//end of populate_editor()

    //add textarea expand event to description fields
    function textarea_init() {
        $('div.form-group textarea[name$="description\]"]').each(function() {
            $(this).off('click input');
            $(this).on('click input', function() {
                textarea_autoexpand(this);
            })
            textarea_autoexpand(this);
        });
    }

    //expand textareas
    function textarea_autoexpand(element) {
        element.setAttribute('style', 'height:' + (element.scrollHeight) + 'px;overflow-y:hidden;');
        element.style.height = 'auto';
        element.style.minHeight = '64px';
        element.style.height = (element.scrollHeight) + 'px';
    }

    function get_parent_array() {
        return parent_array;
    }

    //get a list of existing standard elements
    function update_parent_array() {
        parent_array = [''];
        $("[data-schemaid=\"standardelement\"]").each(function() {
            //number of std elements
            var num = parseInt($(this).data("schemapath").replace(/root\.standardelements\./, ''));
            var field = editor.getEditor("root.standardelements." + num + ".elementid");
            var el = field.getValue();

            parent_array.push(el);
        });
    }
    //add the list of possible parent ids to the dropdown
    function set_parent_array() {
        var field;

        $("[data-schemaid=\"standardelement\"]").each(function() {
            field = ($(this).data("schemapath") + ".parentelementid");
            field = field.replace(/\./g, '\]\[');
            field = field.replace(/^root\](.*)$/, 'root$1\]');
            $("[name=\"" + field + "\"]").empty();
            $.each(parent_array, function (k, value) {
                $("[name=\"" + field + "\"]").append($('<option>', {
                    value: value,
                    text: value
                }));
            });
        });
    }

    //add an event to update the element id when the parent id is changed
    function add_parent_event() {
        $("[data-schemaid=\"parentid\"] .form-control").each(function () {
            $(this).off('change');
            $(this).on('change', function () {
            update_eid(this);
            });
            update_eid(this);
        });
    }

    //update the element id for the passed in standard element
    function update_eid(element) {
        if (element.value) {
            var index = element.name.replace(/.*\[(\d*)\].*/, '$1');
            var eid_field = editor.getEditor("root.standardelements." + index + ".elementid");
            if (eid_field) {
                eid_field.setValue(element.value + "." + get_eid(element.value));
            }
        }
    }

        /**
     * Update the element id after the parent id has been changed
     *  @param parent_id The parent id selected from the dropdown
     */
    function get_eid(parent_id) {
        var pel_array = [];
        $("[data-schemaid=\"standardelement\"] .form-control[name$=\"parentelementid\]\"").each(function () {
            if (this.value) {
                pel_array.push(this.value);
            }
        });
        count_subel = 0;
        $(pel_array).each(function(k, val) {

            if (val == parent_id) {
                count_subel++
            }
        });
        return count_subel;
    }

    /*
    * Manually add the handlers for the standard elements delete buttons
    * needs to add it also after deleting one standard element because
    * the container is refreshed and the buttons recreated
    */
    function update_delete_element_button_handlers() {
      $('[data-schemaid="standardelement"]>h3>div>button.json-editor-btn-delete').off('click');
      $('[data-schemaid="standardelement"]>h3>div>button.json-editor-btn-delete').on('click', function() {
        update_parent_array();
        se_index--;
        //if it's the last element
        if (parseInt(this.attributes['data-i'].value) == parent_array.length) {
          eid--;
        }
        update_delete_element_button_handlers();
        set_editor_dirty();
      });
    }

    /*
    * Manually add the handlers for the standard elements top delete buttons
    * 'Delete last standard element' and 'Delete all'
    */
    function update_delete_button_handler() {
      // 'Delete last standard element' button
      $('div[data-schemaid="standardelements"]>h3>div>button.json-editor-btn-delete').eq(0).on('click', function (){
        update_parent_array();
        eid--;
        se_index--;
        update_delete_element_button_handlers();
        set_editor_dirty();
      });
      // 'Delete all' button
      $('div[data-schemaid="standardelements"]>h3>div>button.json-editor-btn-delete').eq(1).on('click', function (){
        update_parent_array();
        eid = 1;
        se_index = 0;
        update_delete_element_button_handlers();
        set_editor_dirty();
      });
    }

});//end of jQuery wrapper

// form change checker functions
function set_editor_dirty() {
    if (typeof formchangemanager !== 'undefined') {
        formchangemanager.setFormStateById("editor_holder", FORM_CHANGED);
    }
}

function set_editor_clean() {
    if (typeof formchangemanager !== 'undefined') {
        formchangemanager.setFormStateById('editor_holder', FORM_INIT);
    }
}
