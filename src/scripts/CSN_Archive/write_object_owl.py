#!/usr/bin/env python

# Copyright (c) 2015, Scott D. Peckham

#----------------------------------------------------------
# S.D. Peckham
# July 9, 2015
#
# Tool to read a complete list of object names, including
# all parent objects (via check_object_names.py), and then
# create an OWL file that records containment, etc.
#
# Example of use at a Unix prompt:
#
#    % ./write_object_owl.py All_Object_Names.txt
#----------------------------------------------------------
#
# Functions:
#    write_owl()
#
#----------------------------------------------------------

import os.path
import sys

#------------------------------------------------------
def write_owl( in_file='All_Object_Names.txt' ):

    #--------------------------------------------------
    # Open input file that contains copied names table
    #--------------------------------------------------
    try:
        in_unit = open( in_file, 'r' )
    except:
        print 'SORRY: Could not open TXT file named:'
        print '       ' + in_file

    #-------------------------
    # Open new CSV text file
    #-------------------------
    ## pos     = in_file.rfind('.')
    ## prefix  = in_file[0:pos]
    ## out_file = prefix + '.owl'
    out_file = 'All_Object_Names.owl'
    #-------------------------------------------
    OUT_EXISTS = os.path.exists( out_file )
    if (OUT_EXISTS):
        print 'SORRY, A text file with the name'
        print '       ' + out_file
        print '       already exists.'
        return
    out_unit = open( out_file, 'w' )

    #-------------------------------------    
    # Read all object names from in_file
    #-------------------------------------
    object_list = list()
    while (True):
        #------------------------------
        # Read data line from in_file
        #------------------------------   
        line = in_unit.readline()
        if (line == ''):
            break  

        #----------------------------------
        # Save object name in object_list
        #----------------------------------           
        line = line.strip()   # (strip leading/trailing white space)  
        object_list.append( line )

    #----------------------
    # Close the input file
    #----------------------
    in_unit.close()
    
    #-------------------------------    
    # Write OWL output file header
    #-----------------------------------------------------------
    # Copy this long header from "Object_OWL_Header.txt" file.
    #-----------------------------------------------------------
#     header_file = 'Object_OWL_Header.txt'
#     try:
#         header_unit = open( header_file, 'r' )
#     except:
#         print 'SORRY: Could not open TXT file named:'
#         print '       ' + header_file
#     while (True):
#         line = header_unit.readline()
#         ## line = line.strip()   # (strip leading/trailing white space)  
#         if (line == ''):
#             break
#         out_unit.write( line + '\n')  ####
#     header_unit.close()
#     out_unit.write( '\n' )
    
    #------------------------------------------------   
    # Define some string constants, used repeatedly
    #------------------------------------------------
    xml_comment_prefix      = '<!-- http://geosoft-earthcube.org/ontology/'
    xml_comment_suffix      = ' -->'
    named_individual_prefix = '<owl:NamedIndividual rdf:about="&geo;'
    named_individual_suffix = '">'
    named_individual_close  = '</owl:NamedIndividual>'
    rdf_resource_line       = '    <rdf:type rdf:resource="&ontology;Object"/>'
    contains_prefix         = '    <ontology:contains rdf:resource="&geo;'
    contains_suffix         = '"/>'
    rdf_close_line          = '</rdf:RDF>'
    generated_by_line       = '<!-- Generated by Earth System Bridge project script. -->'
    
    #------------------------------------------------    
    # Write entry in OWL file for every object name
    # in the Individuals section of the OWL file
    #------------------------------------------------
    n_objects = len( object_list )

    for k in xrange( n_objects ):
        
        #-----------------------------
        # Write the XML comment line
        #-----------------------------
        object_name = object_list[k]
        xml_comment = xml_comment_prefix + object_name + xml_comment_suffix
        out_unit.write( xml_comment + '\n')
        out_unit.write( '\n' )   # (write a blank line)   
                
        #---------------------------------
        # Write the NamedIndividual line
        #---------------------------------
        named_individual_line = named_individual_prefix + object_name + named_individual_suffix  
        out_unit.write( named_individual_line + '\n') 
        
        #------------------------------
        # Write the RDF Resource line
        #------------------------------        
        out_unit.write( rdf_resource_line + '\n') 

        #-----------------------------------------------
        # Write zero or more "ontology:contains" lines
        #-----------------------------------------------
        j = (k + 1) 
        while (True):
            if (j == n_objects):
                break
            this_name = object_name
            next_name = object_list[j]
            #------------------------------------------------------------
            # Note: We need the underscore in next line to distinguish
            #       between objects like "air", "aircraft" & "airfoil".
            #------------------------------------------------------------
            CONTAINS_NEXT = next_name.startswith( this_name + '_' )
            if not(CONTAINS_NEXT):
                break
            #-------------------------------------
            this_n_delims = this_name.count('_')
            next_n_delims = next_name.count('_')
            DIRECT_CHILD  = ((next_n_delims - this_n_delims) == 1)
            if (DIRECT_CHILD):
                out_unit.write( contains_prefix + next_name + contains_suffix + '\n' )
            j += 1
                
        #-----------------------------------------------
        # Write the NamedIndividual block closing line
        #-----------------------------------------------  
        out_unit.write( named_individual_close + '\n')            
        out_unit.write( '\n\n' )   # (write 2 blank lines)     

    #-----------------------------------
    # Write the RDF block closing line
    #-----------------------------------
    out_unit.write( rdf_close_line + '\n')
    out_unit.write( '\n' )   # (write a blank line) 
        
    #--------------------------------
    # Write the "Generated by" line
    #--------------------------------        
    out_unit.write( generated_by_line + '\n')
    out_unit.write( '\n' )   # (write a blank line) 
             
    #----------------------------
    # Close the TXT output file
    #----------------------------
    out_unit.close()
    print 'Finished writing object names to OWL file.'
    print 'Number of unique object names =', n_objects, '.'
    print ' '
                           
#   write_owl()
#------------------------------------------------------
if (__name__ == "__main__"):
    
    #-----------------------------------------------------
    # Note: First arg in sys.argv is the command itself.
    #-----------------------------------------------------
    n_args = len(sys.argv)
    if (n_args < 2):
        print 'ERROR: This tool requires an input'
        print '       text file argument.'
        print 'sys.argv =', sys.argv
        print ' '
    elif (n_args == 2):
        write_owl( sys.argv[1] )
    else:
        print 'ERROR: Invalid number of arguments.'
        
#-----------------------------------------------------------------------
