
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:strip-space elements="*"/>
    <xsl:variable name="characters-insert-space">0123456789abcdefghijklmnopqrstuvwxyz</xsl:variable>
    <xsl:variable name="symbols-skip-insert-space">,.;</xsl:variable>

    <xsl:template match="/">
        <html>
            <head>
                <link rel="stylesheet" type="text/css" href="/static/style.css"/>
            </head>
            <body>
        <div id="legislation">
            <xsl:apply-templates select="act"/>
        </div>
    </body>
</html>
    </xsl:template>

    <xsl:template match="act">
        <div class="act">
             <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>    
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
             <xsl:apply-templates select="part"/>         
        </div>
    </xsl:template>

    <xsl:template match="part">
        <div class="part">
             <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute> 
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
            <h5 class="prov labelled">
                <span class="label">
                    <xsl:value-of select="label"/>
                </span>
                <xsl:value-of select="heading"/>
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
            <xsl:apply-templates select="label"/>
            <xsl:apply-templates select="para/*[position() > 1]"/>
        </div>
    </xsl:template>

    <xsl:template match="para/label-para">
        <ul class="label-para">
            <li>
                <xsl:apply-templates select="label"/>
                <xsl:apply-templates select="para/label-para"/>
            </li>
        </ul>
    </xsl:template>

    <xsl:template match="para/def-para">       
        <div class="def-para">
             <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>           
            <p class="text">
                 <xsl:apply-templates select="para/text|para/label-para"/>
            </p>
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
        &#160;<strong><xsl:value-of select="."/></strong>
    </xsl:template>


    <xsl:template match="*[@href]">
        <a>
        <xsl:attribute name="href">/search/<xsl:value-of select="@href"/>
        </xsl:attribute>   
            <xsl:value-of select="."/>
        </a>
    </xsl:template>

   <xsl:template match="para/text|insertwords">
         <xsl:apply-templates/>
    </xsl:template>


   <xsl:template match="citation">
         <xsl:apply-templates/>
    </xsl:template>



    <xsl:template match="text()">

       <!--  <xsl:value-of select="string-length(translate(substring(preceding-sibling::*[1]/text(), $length, 1), $characters-insert-space, ''))"/>
        <xsl:if test="substring(preceding-sibling::*[1]/text(), $length, 1) !=',' ">
            &#160; 
        </xsl:if> -->
        <xsl:variable name="length" select="string-length(preceding-sibling::*[1])"/>
          <xsl:if test="string-length(preceding-sibling::*[1]/text())">
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

    <xsl:template match="schedule">
        <div class="schedule">
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
            <xsl:apply-templates select="schedule.provisions"/>
        </div>
    </xsl:template>

</xsl:stylesheet>