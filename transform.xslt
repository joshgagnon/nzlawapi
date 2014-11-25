
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:strip-space elements="*"/>
    <xsl:variable name="characters-insert-space">0123456789abcdefghijklmnopqrstuvwxyz</xsl:variable>
    <xsl:variable name="symbols-skip-insert-space">,.;:)(</xsl:variable>

    <xsl:template match="/">

        <div class="legislation result">
            <div>
            <xsl:apply-templates select="act"/>
              </div>
        </div>
    </xsl:template>

    <xsl:template name="current">
        <xsl:if test="@current = 'true'">
           <xsl:attribute name="class">current</xsl:attribute>   
        </xsl:if>
    </xsl:template>


    <xsl:template match="act">
        <div class="act top-level">
             <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
             <xsl:if test="@terminated = 'repealed'">
               <xsl:attribute name="class">repealed</xsl:attribute>   
            </xsl:if>       
                <xsl:call-template name="current"/> 
              <xsl:apply-templates select="cover"/>       
               <xsl:apply-templates select="front"/> 
             <xsl:apply-templates select="body"/>       
             <xsl:apply-templates select="schedule.group"/>               
        </div>
    </xsl:template>

    <xsl:template match="cover">
        <div class="cover reprint">
        <!--<p class="reprint-date">
            Reprint as at <xsl:value-of select="reprint-date"/>
        </p>-->
        <h1 class="title"><xsl:value-of select="title"/></h1>
        </div>
    </xsl:template>

    <xsl:template match="contents">
    </xsl:template>

    <xsl:template match="front">
        <div class="front">
            <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>   
            <div class="long-title">
                 <xsl:value-of select="long-title/para/text"/>
            
             <xsl:apply-templates select="long-title/para/label-para"/> 
             </div>           
        </div>
    </xsl:template>

    <xsl:template match="body">
        <div class="body">
            <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>   
             <xsl:apply-templates select="part|prov"/>         
        </div>
    </xsl:template>

    <xsl:template match="part">
        <div class="part">
             <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute> 
            <xsl:call-template name="current"/> 
            <h2 class="part">
                <span class="label">Part <xsl:value-of select="label"/></span><br/>
                <xsl:value-of select="heading"/>
            </h2>
            <xsl:apply-templates select="subpart|crosshead|prov"/> 
        </div>
    </xsl:template>

    <xsl:template match="subpart">
        <div class="subpart">
             <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute> 
            <xsl:call-template name="current"/> 
            <h3 class="subpart">
                <span class="label">Subpart <xsl:value-of select="label"/></span><span class="suffix">—</span>
                <xsl:value-of select="heading"/>
            </h3>
            <xsl:apply-templates select="crosshead|prov"/> 
        </div>
    </xsl:template>



    <xsl:template match="prov">
        <div class="prov">
            <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
            <xsl:call-template name="current"/> 
            <h5 class="prov labelled">
                <a>
                    <xsl:attribute name="href">/search_id/<xsl:value-of select="@id"/></xsl:attribute>
                   
                <span class="label">
                    <xsl:value-of select="label"/>
                </span>
                <xsl:value-of select="heading"/>
                </a>
            </h5>
            <ul class="prov">
                <li>
                    <xsl:choose>
                <xsl:when test="prov.body != ''">
                    <xsl:apply-templates select="prov.body/subprov"/>
                </xsl:when>
                        <xsl:otherwise>
                        <span class="deleted label-deleted">[Repealed]</span>
                    </xsl:otherwise>   

                    </xsl:choose>   
                    <xsl:apply-templates select="notes/history/history-note"/>
                </li>
            </ul>
        </div>
    </xsl:template>

    <xsl:template match='prov.body/subprov'>
        <div class="subprov">
            <xsl:call-template name="current"/> 
            <xsl:apply-templates select="label"/>
            <xsl:apply-templates select="para/*[position() > 1]"/>
        </div>
    </xsl:template>

    <xsl:template match="para/label-para">
        <ul class="label-para">
        <xsl:call-template name="current"/> 
            <li>
                <xsl:apply-templates select="label"/>
                <xsl:apply-templates select="para/label-para"/>
            </li>
        </ul>
    </xsl:template>

    <xsl:template match="table">
        <table>
             <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>   
                <colgroup>
                    <xsl:apply-templates select="tgroup/colspec"/>
                </colgroup>
            <tbody>
                <xsl:apply-templates select="tgroup/tbody/row"/>
            </tbody>            
        </table>
    </xsl:template>

    <xsl:template match="colspec">
        <col>
           <xsl:attribute name="style">
               width:<xsl:value-of select="@colwidth"/>
            </xsl:attribute>   
        </col>
    </xsl:template>

    <xsl:template match="row">
        <tr class="row">
            <xsl:apply-templates select="entry"/>    
        </tr>
    </xsl:template>

    <xsl:template match="entry">
        <td>
              <xsl:if test="count(following-sibling::entry) = 0">
              <xsl:attribute name="colspan">
                    <xsl:value-of select="4-count(preceding-sibling::entry)"/>
                </xsl:attribute>   
            </xsl:if>
           <xsl:attribute name="style">
               text-align:<xsl:value-of select="@align"/>
            </xsl:attribute>                          
            <xsl:apply-templates />    
        </td>
    </xsl:template>

    <xsl:template match="def-para">   

        <div class="def-para">
            <xsl:call-template name="current"/> 
             <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>           
            <p class="text">
                 <xsl:apply-templates select="para/text|para/label-para|example"/>
            </p>
        </div>
    </xsl:template>

    <xsl:template match="amend">       
        <div class="def-para">
             <xsl:attribute name="class">
                flush-left-margin-<xsl:value-of select="amend"/>
            </xsl:attribute>           
            <blockquote class="text">
                  <xsl:attribute name="class">
                    amend amend-increment-<xsl:value-of select="increment"/>
                </xsl:attribute>                     
                 <xsl:apply-templates select="def-para"/>
            </blockquote>
        </div>
    </xsl:template>


    <xsl:template match="def-term">
             <dfn class="def-term">
                <xsl:attribute name="id">
                        <xsl:value-of select="def-term/@id"/>
                    </xsl:attribute>
                    <xsl:apply-templates/>           
                </dfn>
            </xsl:template>

    <xsl:template match="label">
        <p class="labelled label">
            <xsl:call-template name="current"/> 
            <xsl:if test="text() != ''">
                <span class="label">
                    (<xsl:value-of select="."/>)
                </span>
            </xsl:if>
            <xsl:choose>
            <xsl:when test="../para/text != ''">
                <xsl:apply-templates select="../para/text[1]"/>
            </xsl:when>
            <xsl:otherwise>
                <span class="deleted label-deleted">[Repealed]</span>
            </xsl:otherwise>
        </xsl:choose>
        </p>
    </xsl:template>


    <xsl:template match='crosshead'>
        <h4 class="crosshead">
             <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>       
                <xsl:value-of select="."/>
            </h4>
    </xsl:template>

    <xsl:template match="notes/history/history-note">
        <p class="history-note">
            <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
            <xsl:apply-templates/>
        </p>
    </xsl:template>


    <xsl:template match="admended-provision|amending-operation">
        <xsl:value-of select="."/>
    </xsl:template>


    <xsl:template match="emphasis[@style='bold']">
        &#160;<span style="font-weight:bold"><xsl:value-of select="."/></span>
    </xsl:template>

    <xsl:template match="emphasis[@style='italic']">
        &#160;<span style="font-style:italic"><xsl:value-of select="."/></span>
    </xsl:template>

    <xsl:template match="*[@href]">
        <a>
        <xsl:attribute name="href">/search_id/<xsl:value-of select="@href"/>
        </xsl:attribute>   
            <xsl:value-of select="."/>
        </a>
    </xsl:template>

   <!-- <xsl:template match="*[@current = 'true']">

        <xsl:attribute name="class">current
        </xsl:attribute>   
          <xsl:apply-templates/>
    </xsl:template> -->

   <xsl:template match="para/text|insertwords">
         <xsl:apply-templates/>
    </xsl:template>


   <xsl:template match="citation">
         <xsl:apply-templates/>
    </xsl:template>


   <xsl:template match="example">
        <div class="example">
            <h6 class="heading"><strong>Example</strong></h6>
            <p  class="text"><xsl:apply-templates select="para"/></p>
        </div>
    </xsl:template>

    <xsl:template match="text()">
        <xsl:variable name="length" select="string-length(preceding-sibling::*[1])"/>
          <xsl:if test="string-length(preceding-sibling::*[1]/.)">
                <xsl:if test="string-length(translate(substring(., 1, 1), $symbols-skip-insert-space, '')) != 0 ">&#160;</xsl:if>
        </xsl:if>
        <xsl:value-of select="."/>

    </xsl:template>

    <xsl:template match="schedule.group">
      <div class="schedule-group">
        <xsl:apply-templates select="schedule"/>
      </div>
    </xsl:template>

    <xsl:template match="schedule.provisions">
      <div class="schedule-provisions">
        <xsl:apply-templates select="prov"/>
      </div>
    </xsl:template>

    <xsl:template match="schedule.misc">
      <div class="schedule-misc">
        <xsl:apply-templates select="para/label-para"/>
      </div>
    </xsl:template>

    <xsl:template match="schedule">
        <div class="schedule">
            <xsl:call-template name="current"/> 
            <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
            <table class="empowering-prov-layout" summary="This table lays out an empowering provision with it's subject. ">
                <tbody><tr>
                    <td class="header">
                        <h2 lang="en-NZ" class="schedule">
                            <span class="label">
                                <span class="hit">Schedule</span>&#160;<xsl:value-of select="label"/>
                            </span><br/>
                            <xsl:value-of select="heading"/>
                        </h2>
                    </td>
                    <td class="empowering-prov">
                    </td>
                    </tr>
                </tbody>
                
            </table>
            <xsl:apply-templates select="schedule.provisions|schedule.misc"/>
        </div>
    </xsl:template>

</xsl:stylesheet>